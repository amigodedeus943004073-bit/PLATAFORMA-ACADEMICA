import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AulaPro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let parsedError = this.state.message;
      try {
        const obj = JSON.parse(this.state.message);
        if (obj && obj.error) {
          parsedError = `Erro na operação (${obj.operationType}) em "${obj.path}": ${obj.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900">Ocorreu um erro na plataforma</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Não foi possível concluir a operação solicitada. Verifique as permissões ou a sua ligação à rede.
            </p>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs font-mono overflow-x-auto break-all">
              {parsedError}
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recarregar Plataforma</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
