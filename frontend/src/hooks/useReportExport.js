// [Académico] Sprint 5 - Hook exportación reportes PDF/Excel/CSV (R30)
import { useState, useCallback } from 'react';

const getJsPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    return jsPDF;
};

const useReportExport = () => {
    const [exportando, setExportando] = useState(false);

    // [Académico] Sprint 5 - R30: PDF con tabla usando jspdf-autotable
    const exportarPDF = useCallback(async (titulo, columnas, filas, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const JsPDF = await getJsPDF();
            const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

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

            doc.autoTable({
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
        } finally {
            setExportando(false);
        }
    }, []);

    // [Académico] Sprint 5 - R30: Excel con xlsx
    const exportarExcel = useCallback(async (datos, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet(datos);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
            XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
        } finally {
            setExportando(false);
        }
    }, []);

    // [Académico] Sprint 5 - R30: CSV con papaparse
    const exportarCSV = useCallback(async (datos, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const Papa = await import('papaparse');
            const csv = Papa.unparse(datos);
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExportando(false);
        }
    }, []);

    return { exportando, exportarPDF, exportarExcel, exportarCSV };
};

export default useReportExport;
