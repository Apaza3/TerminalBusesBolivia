// [Académico] Sprint 5 - Hook exportación reportes PDF/Excel/CSV (R30)
import { useState, useCallback } from 'react';

const getPdfDeps = async () => {
    const pdfMod = await import('jspdf');
    const jsPDF = pdfMod.jsPDF || pdfMod.default;
    const atMod = await import('jspdf-autotable');           // v5: API funcional autoTable(doc, opts)
    const autoTable = atMod.default || atMod.autoTable;
    return { jsPDF, autoTable };
};

const descargarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const useReportExport = () => {
    const [exportando, setExportando] = useState(false);

    // R30: PDF con tabla (jspdf-autotable v5 — API funcional)
    const exportarPDF = useCallback(async (titulo, columnas, filas, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const { jsPDF, autoTable } = await getPdfDeps();
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 297, 210, 'F');

            doc.setTextColor(241, 245, 249);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Terminal Buses Bolivia', 14, 18);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(titulo, 14, 26);
            doc.text(`Generado: ${new Date().toLocaleDateString('es-BO', { dateStyle: 'full' })}`, 14, 32);

            autoTable(doc, {
                startY: 40,
                head: [columnas],
                body: filas,
                theme: 'grid',
                styles: { fillColor: [30, 41, 59], textColor: [241, 245, 249], fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [15, 23, 42] },
                tableLineColor: [51, 65, 85],
                tableLineWidth: 0.3,
            });

            doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error('exportarPDF:', e);
            alert('No se pudo generar el PDF: ' + (e?.message || e));
        } finally {
            setExportando(false);
        }
    }, []);

    // R30: Excel con xlsx
    const exportarExcel = useCallback(async (datos, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            if (!datos?.length) { alert('No hay datos para exportar.'); return; }
            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet(datos);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            descargarBlob(
                new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`,
            );
        } catch (e) {
            console.error('exportarExcel:', e);
            alert('No se pudo generar el Excel: ' + (e?.message || e));
        } finally {
            setExportando(false);
        }
    }, []);

    // R30: CSV sin dependencias (serializador propio)
    const exportarCSV = useCallback(async (datos, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            if (!datos?.length) { alert('No hay datos para exportar.'); return; }
            const cols = Object.keys(datos[0]);
            const esc = (v) => {
                const s = v == null ? '' : String(v);
                return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            };
            const csv = [
                cols.join(','),
                ...datos.map(row => cols.map(c => esc(row[c])).join(',')),
            ].join('\n');
            descargarBlob(
                new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
                `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`,
            );
        } catch (e) {
            console.error('exportarCSV:', e);
            alert('No se pudo generar el CSV: ' + (e?.message || e));
        } finally {
            setExportando(false);
        }
    }, []);

    return { exportando, exportarPDF, exportarExcel, exportarCSV };
};

export default useReportExport;
