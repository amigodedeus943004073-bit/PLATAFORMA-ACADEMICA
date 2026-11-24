import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  UniversityClass,
  ClassJoinCode,
  Enrollment,
  ClassPost,
  ClassResource,
  Assignment,
  Submission,
  PostComment,
  Assessment,
  StudentGrade,
  ResultPublication,
  ClassChatMessage,
  AccentColor,
  PostType,
  PostPriority,
  ResourceCategory,
  AssessmentCategory,
  ResultFormat,
  AcademicYear,
  UserRole,
  BLUEPRINT_LIMITS,
} from '../types/academic';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, BLUEPRINT_LIMITS.urlMax);
  return `https://${trimmed}`.slice(0, BLUEPRINT_LIMITS.urlMax);
}

export interface AttachmentMetadata {
  attachmentId: string;
  attachmentName: string;
  attachmentSize: number;
  attachmentMime: string;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function triggerBlobDownload(
  filename: string,
  content: BlobPart,
  mimeType = 'application/octet-stream'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const sliceSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const chunk = bytes.subarray(i, i + sliceSize);
    let part = '';
    for (let j = 0; j < chunk.length; j += 1) {
      part += String.fromCharCode(chunk[j]);
    }
    binary += part;
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

const ATTACHMENT_CHUNK_CHARS = 450000;

export async function uploadClassAttachment(
  classId: string,
  lecturerId: string,
  file: File
): Promise<AttachmentMetadata> {
  if (!file || file.size <= 0) {
    throw new Error('O ficheiro selecionado está vazio.');
  }
  if (file.size > BLUEPRINT_LIMITS.attachmentMaxBytes) {
    throw new Error('O ficheiro excede o limite máximo de 5 MB por anexo.');
  }

  const buffer = await file.arrayBuffer();
  const base64 = uint8ArrayToBase64(new Uint8Array(buffer));
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += ATTACHMENT_CHUNK_CHARS) {
    chunks.push(base64.slice(i, i + ATTACHMENT_CHUNK_CHARS));
  }

  if (chunks.length < 1 || chunks.length > 20) {
    throw new Error('O tamanho codificado do ficheiro excede a capacidade permitida.');
  }

  const attachmentId = makeSafeId('att');
  const fileName = (file.name || 'ficheiro').trim().slice(0, BLUEPRINT_LIMITS.attachmentNameMax);
  const mimeType = (file.type || 'application/octet-stream').trim().slice(0, 140);
  const metaPath = `classes/${classId}/attachments/${attachmentId}`;

  try {
    await setDoc(doc(db, 'classes', classId, 'attachments', attachmentId), {
      id: attachmentId,
      classId,
      lecturerId,
      fileName,
      mimeType,
      fileSize: file.size,
      chunkCount: chunks.length,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, metaPath);
  }

  try {
    await Promise.all(
      chunks.map((chunkData, index) => {
        const chunkId = `chunk_${index}`;
        return setDoc(
          doc(db, 'classes', classId, 'attachments', attachmentId, 'chunks', chunkId),
          {
            id: chunkId,
            attachmentId,
            classId,
            lecturerId,
            index,
            data: chunkData,
          }
        );
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${metaPath}/chunks`);
  }

  return {
    attachmentId,
    attachmentName: fileName,
    attachmentSize: file.size,
    attachmentMime: mimeType,
  };
}

export async function fetchClassAttachmentBlob(
  classId: string,
  attachmentId: string
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  const metaPath = `classes/${classId}/attachments/${attachmentId}`;
  let metaSnap;
  try {
    metaSnap = await getDoc(doc(db, 'classes', classId, 'attachments', attachmentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, metaPath);
  }

  if (!metaSnap || !metaSnap.exists()) {
    throw new Error('Ficheiro não encontrado ou já foi removido pelo docente.');
  }

  const meta = metaSnap.data() as {
    fileName: string;
    mimeType: string;
    chunkCount: number;
  };

  try {
    const chunkIndices = Array.from({ length: meta.chunkCount }, (_, i) => i);
    const chunkSnaps = await Promise.all(
      chunkIndices.map((idx) =>
        getDoc(doc(db, 'classes', classId, 'attachments', attachmentId, 'chunks', `chunk_${idx}`))
      )
    );

    const parts: string[] = [];
    for (const snap of chunkSnaps) {
      if (!snap.exists()) {
        throw new Error('Parte do ficheiro está em falta.');
      }
      parts.push((snap.data() as { data: string }).data);
    }

    const buffer = base64ToArrayBuffer(parts.join(''));
    const mimeType = meta.mimeType || 'application/octet-stream';
    return {
      blob: new Blob([buffer], { type: mimeType }),
      fileName: meta.fileName || 'conteudo',
      mimeType,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('em falta')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.GET, `${metaPath}/chunks`);
  }
}

export async function downloadClassAttachment(
  classId: string,
  attachmentId: string
): Promise<void> {
  const { blob, fileName, mimeType } = await fetchClassAttachmentBlob(classId, attachmentId);
  triggerBlobDownload(fileName, blob, mimeType);
}

export async function compressImageFile(
  file: File,
  maxDimension = 1800,
  quality = 0.85
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= 900_000) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '') || 'foto_resultados';
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function compressStudentPhotoDataUrl(file: File): Promise<string> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Selecione um ficheiro de imagem válido (JPG, PNG ou WebP).');
  }

  const renderAt = (maxDim: number, quality: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          } else {
            width = Math.max(1, Math.round((width * maxDim) / height));
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a fotografia.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Não foi possível carregar a imagem selecionada.'));
      };

      img.src = objectUrl;
    });

  let dataUrl = await renderAt(240, 0.78);
  if (dataUrl.length > BLUEPRINT_LIMITS.photoMax - 5000) {
    dataUrl = await renderAt(160, 0.62);
  }
  if (dataUrl.length > BLUEPRINT_LIMITS.photoMax) {
    throw new Error('A fotografia é demasiado grande mesmo após compressão. Escolha outra imagem.');
  }
  return dataUrl;
}

function toWinAnsiBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code === 0x2013 || code === 0x2014) {
      bytes.push(0x2d);
    } else if (code >= 0x20 && code <= 0xff) {
      bytes.push(code);
    } else {
      bytes.push(0x3f); // '?' fallback for non-Latin1 characters
    }
  }
  return bytes;
}

function pdfEscapeString(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function stringToLatin1Bytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function buildGradesPdfFile(params: {
  classCode: string;
  classTitle: string;
  lecturerName: string;
  assessmentTitle: string;
  assessmentDate?: string;
  maxPoints: number;
  rows: Array<{
    studentName: string;
    studentCode?: string;
    score: number | null;
    remarks?: string;
  }>;
}): File {
  const rowsPerPage = 32;
  const totalPages = Math.max(1, Math.ceil(params.rows.length / rowsPerPage));

  const gradedScores = params.rows.map((r) => r.score).filter((s): s is number => s !== null);
  const avg =
    gradedScores.length > 0
      ? (gradedScores.reduce((acc, v) => acc + v, 0) / gradedScores.length).toFixed(2)
      : '—';

  const makeTextOp = (fontKey: 'F1' | 'F2', size: number, x: number, y: number, raw: string) => {
    const clean = String.fromCharCode(...toWinAnsiBytes(raw));
    return `BT /${fontKey} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscapeString(clean)}) Tj ET`;
  };

  const pageStreams: string[] = [];
  for (let p = 0; p < totalPages; p += 1) {
    const ops: string[] = [];
    ops.push(makeTextOp('F2', 15, 42, 792, `${params.classCode} - ${params.classTitle}`.slice(0, 72)));
    ops.push(
      makeTextOp(
        'F1',
        11,
        42,
        772,
        `Pauta de Resultados: ${params.assessmentTitle}`.slice(0, 82)
      )
    );
    ops.push(
      makeTextOp(
        'F1',
        9,
        42,
        756,
        `Docente: ${params.lecturerName} | Escala: 0 a ${params.maxPoints} | Data: ${
          params.assessmentDate || new Date().toLocaleDateString('pt-PT')
        } | Media: ${avg}`
      )
    );
    ops.push('0.8 w 42 746 m 553 746 l S');

    // Table header
    ops.push(makeTextOp('F2', 9, 42, 728, 'N.'));
    ops.push(makeTextOp('F2', 9, 72, 728, 'Nome do Estudante'));
    ops.push(makeTextOp('F2', 9, 295, 728, 'N. Estudante'));
    ops.push(makeTextOp('F2', 9, 390, 728, 'Nota'));
    ops.push(makeTextOp('F2', 9, 455, 728, 'Observacoes'));
    ops.push('0.5 w 42 722 m 553 722 l S');

    const slice = params.rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    let y = 704;
    slice.forEach((row, idx) => {
      const globalIdx = p * rowsPerPage + idx + 1;
      const scoreText =
        row.score !== null ? `${row.score.toFixed(1)} / ${params.maxPoints}` : 'Sem nota';
      ops.push(makeTextOp('F1', 9, 42, y, String(globalIdx)));
      ops.push(makeTextOp('F1', 9, 72, y, row.studentName.slice(0, 36)));
      ops.push(makeTextOp('F1', 9, 295, y, (row.studentCode || '-').slice(0, 16)));
      ops.push(makeTextOp('F2', 9, 390, y, scoreText));
      ops.push(makeTextOp('F1', 8, 455, y, (row.remarks || '').slice(0, 22)));
      y -= 20;
    });

    ops.push(
      makeTextOp(
        'F1',
        8,
        42,
        36,
        `Documento gerado em ${new Date().toLocaleString('pt-PT')} - Pagina ${p + 1} de ${totalPages}`
      )
    );
    pageStreams.push(ops.join('\n'));
  }

  // Assemble PDF objects:
  // 1: Catalog, 2: Pages, 3: F1 Helvetica, 4: F2 Helvetica-Bold, then pairs (PageObj, ContentObj)
  const objects: string[] = [];
  const pageObjNums: number[] = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(''); // placeholder for Pages obj 2
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
  );

  let nextObjNum = 5;
  pageStreams.forEach((stream) => {
    const pageNum = nextObjNum;
    const contentNum = nextObjNum + 1;
    nextObjNum += 2;
    pageObjNums.push(pageNum);

    objects.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  });

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
    .map((n) => `${n} 0 R`)
    .join(' ')}] /Count ${pageObjNums.length} >>\nendobj\n`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const slug = `${params.classCode}-${params.assessmentTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

  const pdfBytes = stringToLatin1Bytes(pdf);
  return new File([pdfBytes.buffer as ArrayBuffer], `pauta-${slug || 'resultados'}.pdf`, {
    type: 'application/pdf',
  });
}

export async function deleteClassAttachment(
  classId: string,
  attachmentId?: string
): Promise<void> {
  if (!attachmentId) return;
  try {
    const metaRef = doc(db, 'classes', classId, 'attachments', attachmentId);
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      const chunkCount = (metaSnap.data() as { chunkCount?: number }).chunkCount || 0;
      await Promise.all(
        Array.from({ length: chunkCount }, (_, i) =>
          deleteDoc(doc(db, 'classes', classId, 'attachments', attachmentId, 'chunks', `chunk_${i}`))
        )
      );
      await deleteDoc(metaRef);
    }
  } catch {
    // Non-fatal cleanup if attachment metadata was already deleted
  }
}

// ============================================================================
// SUBSCRIPTIONS (Real-time Firestore listeners with error handling)
// ============================================================================

export function subscribeLecturerClasses(
  lecturerId: string,
  callback: (classes: UniversityClass[]) => void
): Unsubscribe {
  const path = 'classes';
  const q = query(collection(db, path), where('lecturerId', '==', lecturerId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as UniversityClass);
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() || 0;
        const tB = b.createdAt?.toMillis?.() || 0;
        return tB - tA;
      });
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeStudentEnrollments(
  studentId: string,
  callback: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const path = `users/${studentId}/enrollments`;
  const q = query(collection(db, 'users', studentId, 'enrollments'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as Enrollment)
        .filter((e) => e.status === 'active');
      list.sort((a, b) => {
        const tA = a.joinedAt?.toMillis?.() || 0;
        const tB = b.joinedAt?.toMillis?.() || 0;
        return tB - tA;
      });
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeClassById(
  classId: string,
  callback: (cls: UniversityClass | null) => void
): Unsubscribe {
  const path = `classes/${classId}`;
  return onSnapshot(
    doc(db, 'classes', classId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as UniversityClass) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeClassPosts(
  classId: string,
  callback: (posts: ClassPost[]) => void
): Unsubscribe {
  const path = `classes/${classId}/posts`;
  const q = query(collection(db, 'classes', classId, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ClassPost);
      // Pinned posts first, then newest
      list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const tA = a.createdAt?.toMillis?.() || 0;
        const tB = b.createdAt?.toMillis?.() || 0;
        return tB - tA;
      });
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribePostComments(
  classId: string,
  postId: string,
  callback: (comments: PostComment[]) => void
): Unsubscribe {
  const path = `classes/${classId}/posts/${postId}/comments`;
  const q = query(
    collection(db, 'classes', classId, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as PostComment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeClassResources(
  classId: string,
  callback: (resources: ClassResource[]) => void
): Unsubscribe {
  const path = `classes/${classId}/resources`;
  const q = query(collection(db, 'classes', classId, 'resources'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as ClassResource));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeClassAssignments(
  classId: string,
  callback: (assignments: Assignment[]) => void
): Unsubscribe {
  const path = `classes/${classId}/assignments`;
  const q = query(collection(db, 'classes', classId, 'assignments'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Assignment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeAssignmentSubmissions(
  classId: string,
  assignmentId: string,
  callback: (submissions: Submission[]) => void
): Unsubscribe {
  const path = `classes/${classId}/assignments/${assignmentId}/submissions`;
  const q = query(collection(db, 'classes', classId, 'assignments', assignmentId, 'submissions'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Submission));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeStudentSubmission(
  classId: string,
  assignmentId: string,
  studentId: string,
  callback: (sub: Submission | null) => void
): Unsubscribe {
  const path = `classes/${classId}/assignments/${assignmentId}/submissions/${studentId}`;
  return onSnapshot(
    doc(db, 'classes', classId, 'assignments', assignmentId, 'submissions', studentId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as Submission) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeClassEnrollments(
  classId: string,
  callback: (enrollments: Enrollment[]) => void
): Unsubscribe {
  const path = `classes/${classId}/enrollments`;
  const q = query(collection(db, 'classes', classId, 'enrollments'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Enrollment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeClassAssessments(
  classId: string,
  callback: (assessments: Assessment[]) => void
): Unsubscribe {
  const path = `classes/${classId}/assessments`;
  const q = query(collection(db, 'classes', classId, 'assessments'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Assessment));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeAssessmentGrades(
  classId: string,
  assessmentId: string,
  lecturerId: string,
  callback: (grades: StudentGrade[]) => void
): Unsubscribe {
  const path = `classes/${classId}/assessments/${assessmentId}/grades`;
  const q = query(
    collection(db, 'classes', classId, 'assessments', assessmentId, 'grades'),
    where('lecturerId', '==', lecturerId)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as StudentGrade));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeStudentAssessmentGrade(
  classId: string,
  assessmentId: string,
  studentId: string,
  callback: (grade: StudentGrade | null) => void
): Unsubscribe {
  const path = `classes/${classId}/assessments/${assessmentId}/grades/${studentId}`;
  return onSnapshot(
    doc(db, 'classes', classId, 'assessments', assessmentId, 'grades', studentId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as StudentGrade) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeClassResults(
  classId: string,
  callback: (results: ResultPublication[]) => void
): Unsubscribe {
  const path = `classes/${classId}/results`;
  const q = query(collection(db, 'classes', classId, 'results'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as ResultPublication));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeMyEnrollment(
  classId: string,
  studentId: string,
  callback: (enrollment: Enrollment | null) => void
): Unsubscribe {
  const path = `classes/${classId}/enrollments/${studentId}`;
  return onSnapshot(
    doc(db, 'classes', classId, 'enrollments', studentId),
    (snap) => {
      callback(snap.exists() ? (snap.data() as Enrollment) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeClassChatMessages(
  classId: string,
  callback: (messages: ClassChatMessage[]) => void
): Unsubscribe {
  const path = `classes/${classId}/chatMessages`;
  const q = query(
    collection(db, 'classes', classId, 'chatMessages'),
    orderBy('createdAt', 'asc'),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as ClassChatMessage));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function createClass(
  lecturerId: string,
  lecturerName: string,
  input: {
    title: string;
    code: string;
    semester: string;
    course?: string;
    academicYear?: AcademicYear;
    schedule?: string;
    room?: string;
    meetingUrl?: string;
    description?: string;
    accentColor: AccentColor;
  }
): Promise<string> {
  const classId = makeSafeId('cls');
  const joinCode = generateJoinCode();
  const classPath = `classes/${classId}`;
  const cleanCourse = (input.course || '').trim().slice(0, BLUEPRINT_LIMITS.courseMax);
  const cleanYear: AcademicYear = input.academicYear || '1.º Ano';

  const cleanClass = {
    id: classId,
    title: input.title.trim().slice(0, BLUEPRINT_LIMITS.classTitleMax),
    code: input.code.trim().toUpperCase().slice(0, BLUEPRINT_LIMITS.classCodeMax),
    joinCode,
    semester: input.semester.trim().slice(0, BLUEPRINT_LIMITS.semesterMax),
    course: cleanCourse,
    academicYear: cleanYear,
    schedule: (input.schedule || '').trim().slice(0, BLUEPRINT_LIMITS.scheduleMax),
    room: (input.room || '').trim().slice(0, BLUEPRINT_LIMITS.roomMax),
    meetingUrl: normalizeUrl(input.meetingUrl || '').slice(0, BLUEPRINT_LIMITS.meetingUrlMax),
    description: (input.description || '').trim().slice(0, BLUEPRINT_LIMITS.classDescriptionMax),
    accentColor: input.accentColor,
    lecturerId,
    lecturerName: lecturerName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'classes', classId), cleanClass);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, classPath);
  }

  const joinPath = `classJoinCodes/${joinCode}`;
  try {
    await setDoc(doc(db, 'classJoinCodes', joinCode), {
      classId,
      title: cleanClass.title,
      code: cleanClass.code,
      lecturerId,
      lecturerName: cleanClass.lecturerName,
      semester: cleanClass.semester,
      course: cleanCourse,
      academicYear: cleanYear,
      accentColor: cleanClass.accentColor,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, joinPath);
  }

  return classId;
}

export async function updateClass(
  classId: string,
  joinCode: string,
  lecturerName: string,
  input: {
    title: string;
    code: string;
    semester: string;
    course?: string;
    academicYear?: AcademicYear;
    schedule?: string;
    room?: string;
    meetingUrl?: string;
    description?: string;
    accentColor: AccentColor;
    isArchived?: boolean;
  }
): Promise<void> {
  const path = `classes/${classId}`;
  const cleanTitle = input.title.trim().slice(0, BLUEPRINT_LIMITS.classTitleMax);
  const cleanCode = input.code.trim().toUpperCase().slice(0, BLUEPRINT_LIMITS.classCodeMax);
  const cleanSemester = input.semester.trim().slice(0, BLUEPRINT_LIMITS.semesterMax);
  const cleanCourse = (input.course || '').trim().slice(0, BLUEPRINT_LIMITS.courseMax);
  const cleanYear: AcademicYear = input.academicYear || '1.º Ano';

  try {
    await updateDoc(doc(db, 'classes', classId), {
      title: cleanTitle,
      code: cleanCode,
      semester: cleanSemester,
      course: cleanCourse,
      academicYear: cleanYear,
      schedule: (input.schedule || '').trim().slice(0, BLUEPRINT_LIMITS.scheduleMax),
      room: (input.room || '').trim().slice(0, BLUEPRINT_LIMITS.roomMax),
      meetingUrl: normalizeUrl(input.meetingUrl || '').slice(0, BLUEPRINT_LIMITS.meetingUrlMax),
      description: (input.description || '').trim().slice(0, BLUEPRINT_LIMITS.classDescriptionMax),
      accentColor: input.accentColor,
      lecturerName: lecturerName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
      isArchived: Boolean(input.isArchived),
      updatedAt: serverTimestamp(),
    });

    if (joinCode) {
      await updateDoc(doc(db, 'classJoinCodes', joinCode), {
        title: cleanTitle,
        code: cleanCode,
        semester: cleanSemester,
        course: cleanCourse,
        academicYear: cleanYear,
        lecturerName: lecturerName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
        accentColor: input.accentColor,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteClass(classId: string, joinCode: string): Promise<void> {
  try {
    if (joinCode) {
      await deleteDoc(doc(db, 'classJoinCodes', joinCode));
    }
    await deleteDoc(doc(db, 'classes', classId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `classes/${classId}`);
  }
}

export async function lookupClassByJoinCode(rawCode: string): Promise<ClassJoinCode | null> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!BLUEPRINT_LIMITS.joinCodePattern.test(cleanCode)) {
    return null;
  }

  const joinPath = `classJoinCodes/${cleanCode}`;
  try {
    const snap = await getDoc(doc(db, 'classJoinCodes', cleanCode));
    return snap.exists() ? (snap.data() as ClassJoinCode) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, joinPath);
  }
}

export async function enrollStudentByCode(
  rawCode: string,
  studentId: string,
  studentName: string,
  studentCode: string,
  studentPhotoUrl?: string
): Promise<{ success: boolean; message: string; classId?: string }> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!BLUEPRINT_LIMITS.joinCodePattern.test(cleanCode)) {
    return { success: false, message: 'O código de convite deve ter entre 4 e 16 letras ou números.' };
  }

  const cleanName = studentName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax);
  const cleanStudentCode = studentCode.trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax);
  const cleanPhoto =
    typeof studentPhotoUrl === 'string' && studentPhotoUrl.length <= BLUEPRINT_LIMITS.photoMax
      ? studentPhotoUrl
      : '';

  if (cleanName.length < 3) {
    return { success: false, message: 'Indique o seu nome completo (mínimo 3 caracteres).' };
  }
  if (cleanStudentCode.length < 1) {
    return { success: false, message: 'Indique o seu número de estudante.' };
  }

  const joinPath = `classJoinCodes/${cleanCode}`;
  let joinSnap;
  try {
    joinSnap = await getDoc(doc(db, 'classJoinCodes', cleanCode));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, joinPath);
  }

  if (!joinSnap.exists()) {
    return { success: false, message: 'Código de convite não encontrado. Confirme com o seu docente.' };
  }

  const info = joinSnap.data() as ClassJoinCode;
  const enrollPath = `classes/${info.classId}/enrollments/${studentId}`;

  try {
    const classEnrollRef = doc(db, 'classes', info.classId, 'enrollments', studentId);
    const userEnrollRef = doc(db, 'users', studentId, 'enrollments', info.classId);
    const existingSnap = await getDoc(classEnrollRef);

    if (existingSnap.exists()) {
      const updatePayload: Record<string, unknown> = {
        studentName: cleanName,
        studentCode: cleanStudentCode,
        updatedAt: serverTimestamp(),
      };
      if (studentPhotoUrl !== undefined) {
        updatePayload.studentPhotoUrl = cleanPhoto;
      }
      await updateDoc(classEnrollRef, updatePayload);
      const userMirrorSnap = await getDoc(userEnrollRef);
      if (userMirrorSnap.exists()) {
        await updateDoc(userEnrollRef, updatePayload);
      }
      return {
        success: true,
        message: `Registo atualizado na turma ${info.title}!`,
        classId: info.classId,
      };
    }

    const enrollmentPayload = {
      studentId,
      classId: info.classId,
      lecturerId: info.lecturerId,
      studentName: cleanName,
      studentCode: cleanStudentCode,
      ...(cleanPhoto ? { studentPhotoUrl: cleanPhoto } : {}),
      classTitle: info.title,
      classCode: info.code,
      semester: info.semester,
      ...(info.course ? { course: info.course } : {}),
      ...(info.academicYear ? { academicYear: info.academicYear } : {}),
      lecturerName: info.lecturerName,
      accentColor: info.accentColor,
      status: 'active',
      attendanceCount: 0,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(classEnrollRef, enrollmentPayload);
    await setDoc(userEnrollRef, enrollmentPayload);
    return {
      success: true,
      message: `Registo confirmado em ${info.title}!`,
      classId: info.classId,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, enrollPath);
  }
}

export async function updateStudentEnrollmentPhoto(
  classId: string,
  studentId: string,
  studentPhotoUrl: string
): Promise<void> {
  const path = `classes/${classId}/enrollments/${studentId}`;
  const cleanPhoto =
    studentPhotoUrl.length <= BLUEPRINT_LIMITS.photoMax ? studentPhotoUrl : '';
  try {
    await updateDoc(doc(db, 'classes', classId, 'enrollments', studentId), {
      studentPhotoUrl: cleanPhoto,
      updatedAt: serverTimestamp(),
    });
    const mirrorRef = doc(db, 'users', studentId, 'enrollments', classId);
    const mirrorSnap = await getDoc(mirrorRef);
    if (mirrorSnap.exists()) {
      await updateDoc(mirrorRef, {
        studentPhotoUrl: cleanPhoto,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateEnrollmentAttendance(
  classId: string,
  studentId: string,
  newCount: number
): Promise<void> {
  const path = `classes/${classId}/enrollments/${studentId}`;
  const bounded = Math.max(0, Math.min(500, Math.round(newCount)));
  try {
    await updateDoc(doc(db, 'classes', classId, 'enrollments', studentId), {
      attendanceCount: bounded,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeEnrollment(classId: string, studentId: string): Promise<void> {
  const path = `classes/${classId}/enrollments/${studentId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'enrollments', studentId));
    await deleteDoc(doc(db, 'users', studentId, 'enrollments', classId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createPost(
  classId: string,
  lecturerId: string,
  authorName: string,
  input: {
    type: PostType;
    priority: PostPriority;
    module?: string;
    title: string;
    body?: string;
    externalUrl?: string;
    externalLabel?: string;
    attachment?: AttachmentMetadata;
    isPinned?: boolean;
  }
): Promise<string> {
  const postId = makeSafeId('post');
  const path = `classes/${classId}/posts/${postId}`;

  try {
    await setDoc(doc(db, 'classes', classId, 'posts', postId), {
      id: postId,
      classId,
      lecturerId,
      authorId: lecturerId,
      authorName: authorName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
      type: input.type,
      priority: input.priority,
      module: (input.module || 'Geral').trim().slice(0, BLUEPRINT_LIMITS.moduleMax),
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.postTitleMax),
      body: (input.body || '').trim().slice(0, BLUEPRINT_LIMITS.postBodyMax),
      externalUrl: normalizeUrl(input.externalUrl || ''),
      externalLabel: (input.externalLabel || '').trim().slice(0, BLUEPRINT_LIMITS.externalLabelMax),
      ...(input.attachment
        ? {
            attachmentId: input.attachment.attachmentId,
            attachmentName: input.attachment.attachmentName,
            attachmentSize: input.attachment.attachmentSize,
            attachmentMime: input.attachment.attachmentMime,
          }
        : {}),
      isPinned: Boolean(input.isPinned),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return postId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function togglePostPin(
  classId: string,
  postId: string,
  isPinned: boolean
): Promise<void> {
  const path = `classes/${classId}/posts/${postId}`;
  try {
    await updateDoc(doc(db, 'classes', classId, 'posts', postId), {
      isPinned,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePost(
  classId: string,
  postId: string,
  attachmentId?: string
): Promise<void> {
  const path = `classes/${classId}/posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'posts', postId));
    if (attachmentId) {
      await deleteClassAttachment(classId, attachmentId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addComment(
  classId: string,
  postId: string,
  authorId: string,
  authorName: string,
  authorRole: UserRole,
  text: string
): Promise<void> {
  const commentId = makeSafeId('cmt');
  const path = `classes/${classId}/posts/${postId}/comments/${commentId}`;
  try {
    await setDoc(doc(db, 'classes', classId, 'posts', postId, 'comments', commentId), {
      id: commentId,
      postId,
      classId,
      authorId,
      authorName: authorName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
      authorRole,
      text: text.trim().slice(0, BLUEPRINT_LIMITS.commentMax),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteComment(
  classId: string,
  postId: string,
  commentId: string
): Promise<void> {
  const path = `classes/${classId}/posts/${postId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'posts', postId, 'comments', commentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createResource(
  classId: string,
  lecturerId: string,
  input: {
    title: string;
    url: string;
    category: ResourceCategory;
    module?: string;
    description?: string;
    attachment?: AttachmentMetadata;
  }
): Promise<string> {
  const resourceId = makeSafeId('res');
  const path = `classes/${classId}/resources/${resourceId}`;
  const resolvedUrl = input.attachment
    ? `local://${input.attachment.attachmentId}`
    : normalizeUrl(input.url);

  try {
    await setDoc(doc(db, 'classes', classId, 'resources', resourceId), {
      id: resourceId,
      classId,
      lecturerId,
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.resourceTitleMax),
      url: resolvedUrl,
      category: input.category,
      module: (input.module || 'Geral').trim().slice(0, BLUEPRINT_LIMITS.moduleMax),
      description: (input.description || '').trim().slice(0, BLUEPRINT_LIMITS.resourceDescriptionMax),
      ...(input.attachment
        ? {
            attachmentId: input.attachment.attachmentId,
            attachmentName: input.attachment.attachmentName,
            attachmentSize: input.attachment.attachmentSize,
            attachmentMime: input.attachment.attachmentMime,
          }
        : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return resourceId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteResource(
  classId: string,
  resourceId: string,
  attachmentId?: string
): Promise<void> {
  const path = `classes/${classId}/resources/${resourceId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'resources', resourceId));
    if (attachmentId) {
      await deleteClassAttachment(classId, attachmentId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createAssignment(
  classId: string,
  lecturerId: string,
  input: {
    title: string;
    description?: string;
    dueDate?: string;
    maxPoints: number;
    referenceUrl?: string;
  }
): Promise<string> {
  const assignmentId = makeSafeId('asg');
  const path = `classes/${classId}/assignments/${assignmentId}`;
  try {
    await setDoc(doc(db, 'classes', classId, 'assignments', assignmentId), {
      id: assignmentId,
      classId,
      lecturerId,
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.assignmentTitleMax),
      description: (input.description || '').trim().slice(0, BLUEPRINT_LIMITS.assignmentDescriptionMax),
      dueDate: (input.dueDate || '').trim().slice(0, BLUEPRINT_LIMITS.dueDateMax),
      maxPoints: Math.max(1, Math.min(1000, Number(input.maxPoints) || 20)),
      referenceUrl: normalizeUrl(input.referenceUrl || ''),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return assignmentId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleAssignmentStatus(
  classId: string,
  assignmentId: string,
  status: 'open' | 'closed'
): Promise<void> {
  const path = `classes/${classId}/assignments/${assignmentId}`;
  try {
    await updateDoc(doc(db, 'classes', classId, 'assignments', assignmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAssignment(classId: string, assignmentId: string): Promise<void> {
  const path = `classes/${classId}/assignments/${assignmentId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'assignments', assignmentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function submitAssignment(
  classId: string,
  assignmentId: string,
  lecturerId: string,
  studentId: string,
  studentName: string,
  submissionUrl: string,
  notes: string,
  isUpdate: boolean
): Promise<void> {
  const path = `classes/${classId}/assignments/${assignmentId}/submissions/${studentId}`;
  try {
    if (isUpdate) {
      await updateDoc(doc(db, 'classes', classId, 'assignments', assignmentId, 'submissions', studentId), {
        submissionUrl: normalizeUrl(submissionUrl),
        notes: notes.trim().slice(0, BLUEPRINT_LIMITS.submissionNotesMax),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'classes', classId, 'assignments', assignmentId, 'submissions', studentId), {
        studentId,
        studentName: studentName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
        classId,
        assignmentId,
        lecturerId,
        submissionUrl: normalizeUrl(submissionUrl),
        notes: notes.trim().slice(0, BLUEPRINT_LIMITS.submissionNotesMax),
        grade: 0,
        isGraded: false,
        feedback: '',
        status: 'submitted',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function gradeSubmission(
  classId: string,
  assignmentId: string,
  studentId: string,
  grade: number,
  feedback: string
): Promise<void> {
  const path = `classes/${classId}/assignments/${assignmentId}/submissions/${studentId}`;
  try {
    await updateDoc(doc(db, 'classes', classId, 'assignments', assignmentId, 'submissions', studentId), {
      grade: Math.max(0, Math.min(1000, Number(grade) || 0)),
      isGraded: true,
      feedback: feedback.trim().slice(0, BLUEPRINT_LIMITS.feedbackMax),
      status: 'graded',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createAssessment(
  classId: string,
  lecturerId: string,
  input: {
    title: string;
    category: AssessmentCategory;
    date?: string;
    maxPoints: number;
    notes?: string;
  }
): Promise<string> {
  const assessmentId = makeSafeId('av');
  const path = `classes/${classId}/assessments/${assessmentId}`;
  try {
    await setDoc(doc(db, 'classes', classId, 'assessments', assessmentId), {
      id: assessmentId,
      classId,
      lecturerId,
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.assessmentTitleMax),
      category: input.category,
      date: (input.date || '').trim().slice(0, BLUEPRINT_LIMITS.dueDateMax),
      maxPoints: Math.max(1, Math.min(1000, Number(input.maxPoints) || 20)),
      notes: (input.notes || '').trim().slice(0, BLUEPRINT_LIMITS.assessmentNotesMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return assessmentId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteAssessment(classId: string, assessmentId: string): Promise<void> {
  const path = `classes/${classId}/assessments/${assessmentId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'assessments', assessmentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveStudentGrade(
  classId: string,
  assessmentId: string,
  lecturerId: string,
  input: {
    studentId: string;
    studentName: string;
    studentCode?: string;
    score: number;
    maxPoints: number;
    remarks?: string;
  }
): Promise<void> {
  const path = `classes/${classId}/assessments/${assessmentId}/grades/${input.studentId}`;
  const gradeRef = doc(db, 'classes', classId, 'assessments', assessmentId, 'grades', input.studentId);
  const clampedScore = Math.max(0, Math.min(input.maxPoints, Number(input.score) || 0));
  const cleanName = input.studentName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax);
  const cleanCode = (input.studentCode || '').trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax);
  const cleanRemarks = (input.remarks || '').trim().slice(0, BLUEPRINT_LIMITS.gradeRemarksMax);

  try {
    const existing = await getDoc(gradeRef);
    if (existing.exists()) {
      await updateDoc(gradeRef, {
        score: clampedScore,
        remarks: cleanRemarks,
        studentName: cleanName,
        studentCode: cleanCode,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(gradeRef, {
        studentId: input.studentId,
        studentName: cleanName,
        studentCode: cleanCode,
        classId,
        assessmentId,
        lecturerId,
        score: clampedScore,
        remarks: cleanRemarks,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBatchStudentGrades(
  classId: string,
  assessmentId: string,
  lecturerId: string,
  items: Array<{
    studentId: string;
    studentName: string;
    studentCode?: string;
    score: number;
    maxPoints: number;
    remarks?: string;
  }>
): Promise<void> {
  await Promise.all(
    items.map((item) => saveStudentGrade(classId, assessmentId, lecturerId, item))
  );
}

export async function createResultPublication(
  classId: string,
  lecturerId: string,
  authorName: string,
  input: {
    title: string;
    assessmentTitle?: string;
    format: ResultFormat;
    notes?: string;
    publishedDate?: string;
    attachment: AttachmentMetadata;
  }
): Promise<string> {
  const resultId = makeSafeId('respub');
  const path = `classes/${classId}/results/${resultId}`;
  try {
    await setDoc(doc(db, 'classes', classId, 'results', resultId), {
      id: resultId,
      classId,
      lecturerId,
      authorName: authorName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
      title: input.title.trim().slice(0, BLUEPRINT_LIMITS.resultTitleMax),
      assessmentTitle: (input.assessmentTitle || '').trim().slice(0, 120),
      format: input.format,
      notes: (input.notes || '').trim().slice(0, BLUEPRINT_LIMITS.resultNotesMax),
      attachmentId: input.attachment.attachmentId,
      attachmentName: input.attachment.attachmentName,
      attachmentSize: input.attachment.attachmentSize,
      attachmentMime: input.attachment.attachmentMime,
      publishedDate: (input.publishedDate || '').trim().slice(0, BLUEPRINT_LIMITS.dueDateMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return resultId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteResultPublication(
  classId: string,
  resultId: string,
  attachmentId?: string
): Promise<void> {
  const path = `classes/${classId}/results/${resultId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'results', resultId));
    if (attachmentId) {
      await deleteClassAttachment(classId, attachmentId);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendClassChatMessage(
  classId: string,
  lecturerId: string,
  input: {
    authorId: string;
    authorName: string;
    authorRole: UserRole;
    authorStudentCode?: string;
    authorPhotoUrl?: string;
    text: string;
  }
): Promise<string> {
  const messageId = makeSafeId('msg');
  const path = `classes/${classId}/chatMessages/${messageId}`;
  const cleanText = input.text.trim().slice(0, BLUEPRINT_LIMITS.chatMessageMax);
  if (!cleanText) {
    throw new Error('Escreva uma mensagem antes de enviar.');
  }

  const cleanPhoto =
    input.authorPhotoUrl && input.authorPhotoUrl.length <= BLUEPRINT_LIMITS.photoMax
      ? input.authorPhotoUrl
      : '';
  const cleanCode = (input.authorStudentCode || '').trim().slice(0, BLUEPRINT_LIMITS.studentCodeMax);

  try {
    await setDoc(doc(db, 'classes', classId, 'chatMessages', messageId), {
      id: messageId,
      classId,
      lecturerId,
      authorId: input.authorId,
      authorName: input.authorName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax),
      authorRole: input.authorRole,
      ...(cleanCode ? { authorStudentCode: cleanCode } : {}),
      ...(cleanPhoto ? { authorPhotoUrl: cleanPhoto } : {}),
      text: cleanText,
      createdAt: serverTimestamp(),
    });
    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteClassChatMessage(classId: string, messageId: string): Promise<void> {
  const path = `classes/${classId}/chatMessages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId, 'chatMessages', messageId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function seedSampleAcademicClasses(
  lecturerId: string,
  lecturerName: string
): Promise<void> {
  const cls1 = await createClass(lecturerId, lecturerName, {
    title: 'Engenharia de Software II',
    code: 'INF-304',
    semester: '2026/2027 · 1.º Semestre',
    course: 'Licenciatura em Engenharia Informática',
    academicYear: '3.º Ano',
    schedule: 'Terças e Quintas · 10:00 – 12:00',
    room: 'Anfiteatro A3 / Híbrido',
    meetingUrl: 'https://meet.google.com',
    description:
      'Arquitetura de sistemas distribuídos, padrões de projeto avançados, testes automatizados e engenharia de requisitos em equipas ágeis.',
    accentColor: 'indigo',
  });

  await createPost(cls1, lecturerId, lecturerName, {
    type: 'comunicado',
    priority: 'importante',
    module: 'Semana 1 · Boas-vindas',
    title: 'Plano de Aulas, Bibliografia e Regras de Avaliação',
    body: 'Caros estudantes, sejam bem-vindos à unidade curricular. Consultem o separador "Conteúdos & Sites" para aceder à documentação oficial, aos repositórios base e ao calendário das entregas práticas.',
    externalUrl: 'https://refactoring.guru/design-patterns',
    externalLabel: 'Guia de Padrões de Projeto',
    isPinned: true,
  });

  await createResource(cls1, lecturerId, {
    title: 'Portal de Engenharia & Padrões de Arquitetura',
    url: 'https://martinfowler.com/architecture/',
    category: 'site',
    module: 'Módulo 1 · Arquitetura',
    description: 'Artigos de referência sobre microserviços, arquitetura limpa e eventos.',
  });

  await createAssignment(cls1, lecturerId, {
    title: 'Projeto 1: Especificação de Arquitetura Orientada a Eventos',
    description:
      'Submeter o link do repositório GitHub com o diagrama C4 e protótipo funcional da camada de domínio.',
    dueDate: '2026-12-10',
    maxPoints: 20,
    referenceUrl: 'https://c4model.com/',
  });

  const cls2 = await createClass(lecturerId, lecturerName, {
    title: 'Inteligência Artificial Aplicada',
    code: 'IA-410',
    semester: '2026/2027 · 1.º Semestre',
    course: 'Licenciatura em Sistemas Inteligentes',
    academicYear: '4.º Ano',
    schedule: 'Segundas e Quartas · 14:30 – 16:30',
    room: 'Laboratório 2B',
    meetingUrl: 'https://meet.google.com',
    description:
      'Modelos de linguagem, aprendizagem profunda, avaliação rigorosa de sistemas generativos e ética computacional.',
    accentColor: 'emerald',
  });

  await createPost(cls2, lecturerId, lecturerName, {
    type: 'conteudo',
    priority: 'normal',
    module: 'Módulo 1 · Fundamentos',
    title: 'Caderno Prático de Redes Neuronais e PyTorch',
    body: 'Disponibilizamos o portal interativo para os exercícios da primeira semana. Preparem os ambientes antes da aula prática de quarta-feira.',
    externalUrl: 'https://pytorch.org/tutorials/',
    externalLabel: 'Abrir Tutoriais Oficiais PyTorch',
    isPinned: false,
  });
}
