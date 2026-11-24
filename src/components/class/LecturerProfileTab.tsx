import React, { useState, useEffect } from 'react';
import {
  UniversityClass,
  LecturerPublicProfile,
  BLUEPRINT_LIMITS,
} from '../../types/academic';
import { saveLecturerPublicProfile } from '../../services/academicService';
import { StudentAvatar, StudentPhotoPicker } from '../StudentAvatar';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Clock,
  MapPin,
  Mail,
  Phone,
  Globe,
  Edit3,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LecturerProfileTabProps {
  cls: UniversityClass;
  lecturerProfile: LecturerPublicProfile | null;
  canManage: boolean;
  onOpenDirectChat: () => void;
}

export const LecturerProfileTab: React.FC<LecturerProfileTabProps> = ({
  cls,
  lecturerProfile,
  canManage,
  onOpenDirectChat,
}) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDisplayName(lecturerProfile?.displayName || cls.lecturerName || '');
    setAcademicTitle(lecturerProfile?.academicTitle || '');
    setSchool(lecturerProfile?.school || cls.school || '');
    setDepartment(lecturerProfile?.department || cls.course || cls.department || '');
    setSpecialization(lecturerProfile?.specialization || '');
    setBio(lecturerProfile?.bio || '');
    setOfficeHours(lecturerProfile?.officeHours || '');
    setOfficeLocation(lecturerProfile?.officeLocation || cls.room || '');
    setContactEmail(lecturerProfile?.contactEmail || '');
    setPhone(lecturerProfile?.phone || '');
    setWebsiteUrl(lecturerProfile?.websiteUrl || '');
    setPhotoUrl(lecturerProfile?.photoUrl || '');
  }, [lecturerProfile, cls]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Indique o nome de apresentação do professor.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveLecturerPublicProfile(cls.lecturerId, {
        displayName,
        academicTitle,
        school,
        department,
        specialization,
        bio,
        officeHours,
        officeLocation,
        contactEmail,
        phone,
        websiteUrl,
        photoUrl,
      });
      setEditing(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar informações do professor.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveName = lecturerProfile?.displayName || cls.lecturerName;
  const effectiveSchool = lecturerProfile?.school || cls.school;
  const effectiveDepartment = lecturerProfile?.department || cls.course || cls.department;

  return (
    <div className="space-y-5">
      {/* Hero Lecturer Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <StudentAvatar
              name={effectiveName}
              photoUrl={lecturerProfile?.photoUrl}
              size="lg"
              tone="lecturer"
            />
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[11px] font-semibold">
                  <GraduationCap className="w-3 h-3" />
                  <span>Docente da Turma</span>
                </span>
                {lecturerProfile?.academicTitle && (
                  <span className="text-xs font-medium text-slate-600">
                    {lecturerProfile.academicTitle}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                {effectiveName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {effectiveSchool && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{effectiveSchool}</span>
                  </span>
                )}
                {effectiveDepartment && (
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{effectiveDepartment}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!canManage && (
              <button
                type="button"
                onClick={onOpenDirectChat}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Conversar com o Professor</span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  editing
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white'
                }`}
              >
                {editing ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar Edição</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Painel do Professor</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Informações do professor atualizadas e visíveis para todos os estudantes da turma.</span>
          </div>
        )}

        {/* Inline Edit Form for Lecturer */}
        {editing && canManage && (
          <form onSubmit={handleSave} className="pt-4 border-t border-slate-200 space-y-4 animate-fadeIn">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome de Apresentação *
                </label>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.displayNameMax}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ex: Prof. Dr. António Manuel"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grau / Título Académico
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.academicTitleMax}
                  value={academicTitle}
                  onChange={(e) => setAcademicTitle(e.target.value)}
                  placeholder="ex: Professor Doutor · Mestre em Engenharia"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Escola / Faculdade / Instituto
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.schoolMax}
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="ex: Escola Superior de Tecnologia"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Departamento / Área Científica
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.departmentMax}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="ex: Departamento de Ciência da Computação"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Áreas de Especialização e Disciplinas Lecionadas
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.specializationMax}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="ex: Sistemas Distribuídos, Arquitetura de Software, Bases de Dados"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biografia &amp; Apresentação Académica
              </label>
              <textarea
                rows={4}
                maxLength={BLUEPRINT_LIMITS.bioMax}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Fale sobre a sua formação académica, experiência docente, investigação e orientações para os estudantes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 resize-y"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Horário de Atendimento aos Estudantes
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.officeHoursMax}
                  value={officeHours}
                  onChange={(e) => setOfficeHours(e.target.value)}
                  placeholder="ex: Terças 14:00–16:00 · Quintas 10:00–12:00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gabinete / Local de Atendimento
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.officeLocationMax}
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  placeholder="ex: Gabinete 204 · Edifício Central"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Institucional (Opcional)
                </label>
                <input
                  type="email"
                  maxLength={BLUEPRINT_LIMITS.contactEmailMax}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="docente@universidade.edu"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / Extensão (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.phoneMax}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: +244 923 000 000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Site / ORCID / Currículo (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={BLUEPRINT_LIMITS.websiteUrlMax}
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://orcid.org/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <StudentPhotoPicker
              compact
              photoUrl={photoUrl}
              onChange={setPhotoUrl}
              label="Fotografia do Professor (Opcional)"
              helperText="Apresentada no painel sobre o professor e nas mensagens."
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'A guardar...' : 'Guardar Informações do Professor'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Information Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Bio & Specialization */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span>Sobre o Professor</span>
            </h3>
            {lecturerProfile?.bio ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {lecturerProfile.bio}
              </p>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                {canManage
                  ? 'Ainda não preencheu a sua biografia académica. Clique em "Editar Painel do Professor" acima para partilhar o seu percurso, experiência e orientações com os estudantes.'
                  : `${effectiveName} é o docente responsável pela unidade curricular ${cls.title} (${cls.code}). Utilize o botão "Conversar com o Professor" para enviar dúvidas ou marcar atendimento.`}
              </p>
            )}
          </div>

          {lecturerProfile?.specialization && (
            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Áreas de Especialização &amp; Ensino
              </h4>
              <p className="text-sm font-medium text-slate-800">{lecturerProfile.specialization}</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Disciplina nesta Turma</span>
              <div className="font-semibold text-slate-900 mt-0.5">
                {cls.code} · {cls.title}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Ano Letivo / Curso</span>
              <div className="font-semibold text-slate-900 mt-0.5">
                {cls.semester}
                {cls.academicYear ? ` · ${cls.academicYear}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Office Hours & Contacts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Atendimento &amp; Contactos</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-700">Horário de Atendimento</div>
                <div className="text-slate-600 mt-0.5">
                  {lecturerProfile?.officeHours || cls.schedule || 'Por marcação via conversa direta'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-700">Gabinete / Sala</div>
                <div className="text-slate-600 mt-0.5">
                  {lecturerProfile?.officeLocation || cls.room || 'A confirmar com o docente'}
                </div>
              </div>
            </div>

            {lecturerProfile?.contactEmail && (
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-700">Email Institucional</div>
                  <a
                    href={`mailto:${lecturerProfile.contactEmail}`}
                    className="text-blue-700 hover:underline break-all mt-0.5 inline-block"
                  >
                    {lecturerProfile.contactEmail}
                  </a>
                </div>
              </div>
            )}

            {lecturerProfile?.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-700">Telefone / Extensão</div>
                  <div className="text-slate-600 font-mono mt-0.5">{lecturerProfile.phone}</div>
                </div>
              </div>
            )}

            {lecturerProfile?.websiteUrl && (
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-700">Página / Currículo</div>
                  <a
                    href={lecturerProfile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 hover:underline break-all mt-0.5 inline-block"
                  >
                    {lecturerProfile.websiteUrl}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenDirectChat}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{canManage ? 'Ver Mensagens Privadas' : 'Enviar Mensagem ao Professor'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
