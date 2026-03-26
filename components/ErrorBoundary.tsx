import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-4xl mb-4">😵</div>
                    <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
                    <p className="text-slate-400 mb-6">La aplicación encontró un error inesperado.</p>
                    <pre className="bg-slate-800 p-4 rounded text-left text-xs font-mono text-red-300 max-w-2xl overflow-auto mb-8">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => { window.localStorage.clear(); window.location.reload(); }}
                        className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-bold"
                    >
                        Borrar datos y recargar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
