import React from 'react';

/**
 * Captura excepciones de render para que un error en una sub-vista
 * no deje la pantalla en blanco ni bloquee la navegación.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info?.componentStack);
    }

    reset = () => {
        this.setState({ error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.error) {
            return (
                <div style={{
                    padding: '2.5rem', textAlign: 'center', color: '#fca5a5',
                    background: '#0d1a2e', border: '1px solid #7f1d1d', borderRadius: 14,
                    maxWidth: 480, margin: '2rem auto',
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f1f5f9', marginBottom: '0.5rem' }}>
                        Algo salió mal en esta vista
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem', wordBreak: 'break-word' }}>
                        {this.state.error?.message || 'Error inesperado.'}
                    </div>
                    <button onClick={this.reset} style={{
                        background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10,
                        padding: '0.65rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                    }}>↩ Volver</button>
                </div>
            );
        }
        return this.props.children;
    }
}
