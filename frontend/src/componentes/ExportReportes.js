import React from 'react';
import useReportExport from '../hooks/useReportExport';

const ExportReportes = ({
    titulo = 'Reporte',
    columnas = [],
    filas = [],
    datosExcel = [],
    nombreArchivo = 'reporte_tbb',
    formatos = ['pdf', 'excel', 'csv'],
    capturaId = null,
    hojas = null,
}) => {
    const { exportando, exportarPDF, exportarPDFCanvas, exportarExcel, exportarExcelMulti, exportarCSV } = useReportExport();

    const BTN_STYLE = (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.45rem 0.9rem', borderRadius: 7, border: `1px solid ${color}40`,
        background: `${color}15`, color, fontWeight: 600, fontSize: '0.78rem',
        cursor: exportando ? 'not-allowed' : 'pointer', opacity: exportando ? 0.6 : 1,
        transition: 'all 0.15s',
    });

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {exportando && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Generando...</span>
            )}
            {formatos.includes('pdf') && (
                <button
                    style={BTN_STYLE('#ef4444')}
                    disabled={exportando}
                    onClick={() => capturaId
                        ? exportarPDFCanvas(capturaId, titulo, columnas, filas, nombreArchivo)
                        : exportarPDF(titulo, columnas, filas, nombreArchivo)}
                >
                    📄 PDF
                </button>
            )}
            {formatos.includes('excel') && (
                <button
                    style={BTN_STYLE('#10b981')}
                    disabled={exportando}
                    onClick={() => hojas
                        ? exportarExcelMulti(hojas, nombreArchivo)
                        : exportarExcel(datosExcel.length ? datosExcel : filas.map(f =>
                            Object.fromEntries(columnas.map((c, i) => [c, f[i]]))
                        ), nombreArchivo)}
                >
                    📊 Excel
                </button>
            )}
            {formatos.includes('csv') && (
                <button
                    style={BTN_STYLE('#3b82f6')}
                    disabled={exportando}
                    onClick={() => exportarCSV(datosExcel.length ? datosExcel : filas.map(f =>
                        Object.fromEntries(columnas.map((c, i) => [c, f[i]]))
                    ), nombreArchivo)}
                >
                    📋 CSV
                </button>
            )}
        </div>
    );
};

export default ExportReportes;
