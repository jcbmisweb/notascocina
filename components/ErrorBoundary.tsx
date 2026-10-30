import React, { ReactNode } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from './icons';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as new (props: Props) => {
  props: Props;
  state: State;
  setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;
  render(): ReactNode;
}) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangleIcon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {this.props.fallbackTitle || 'Ha ocurrido un problema al cargar esta vista'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error?.message || 'Error inesperado al procesar los datos de grupos o alumnos.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition shadow-sm cursor-pointer"
              >
                <RefreshCwIcon className="w-4 h-4" />
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg transition cursor-pointer"
              >
                Recargar aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
