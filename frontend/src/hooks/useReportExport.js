import { useState, useCallback } from 'react';

const getPdfDeps = async () => {
    const pdfMod = await import('jspdf');
    const jsPDF = pdfMod.jsPDF || pdfMod.default;
    const atMod = await import('jspdf-autotable');
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

    const exportarPDFCanvas = useCallback(async (elementId, titulo, columnas, filas, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF, autoTable } = await getPdfDeps();
            const el = document.getElementById(elementId);
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = 210, pageH = 297, margin = 10;
            doc.setTextColor(15, 23, 42); doc.setFontSize(15); doc.setFont('helvetica', 'bold');
            doc.text('Terminal Buses Bolivia', margin, 15);
            doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text(titulo, margin, 22);
            let y = 28;

            const bloques = el ? Array.from(el.querySelectorAll('.pdf-block')) : [];
            const nodos = bloques.length ? bloques : (el ? [el] : []);
            const imgW = pageW - margin * 2;
            for (const nodo of nodos) {
                const canvas = await html2canvas(nodo, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
                const imgH = canvas.height * imgW / canvas.width;
                if (y + imgH > pageH - margin) { doc.addPage(); y = margin; }
                doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgW, imgH);
                y += imgH + 4;
            }

            if (filas && filas.length) {
                doc.addPage();
                doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
                doc.text('Datos', margin, 15);
                autoTable(doc, {
                    startY: 20, head: [columnas], body: filas, theme: 'grid',
                    styles: { fillColor: [255, 255, 255], textColor: [30, 41, 59], fontSize: 9, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
                    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                });
            }
            doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error('exportarPDFCanvas:', e);
            alert('No se pudo generar el PDF: ' + (e?.message || e));
        } finally {
            setExportando(false);
        }
    }, []);

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

    const exportarExcelMulti = useCallback(async (sheets, nombreArchivo = 'reporte') => {
        setExportando(true);
        try {
            const validas = (sheets || []).filter(s => s.datos && s.datos.length);
            if (!validas.length) { alert('No hay datos para exportar.'); return; }
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            for (const s of validas) {
                const ws = XLSX.utils.json_to_sheet(s.datos);
                XLSX.utils.book_append_sheet(wb, ws, s.nombre.slice(0, 31));
            }
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            descargarBlob(
                new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`,
            );
        } catch (e) {
            console.error('exportarExcelMulti:', e);
            alert('No se pudo generar el Excel: ' + (e?.message || e));
        } finally {
            setExportando(false);
        }
    }, []);

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

    return { exportando, exportarPDF, exportarPDFCanvas, exportarExcel, exportarExcelMulti, exportarCSV };
};

export default useReportExport;
