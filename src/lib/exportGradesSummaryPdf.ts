import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./robotoFont";

interface ExportGradeEntry {
  date: string;
  label: string;
  percent: number;
  comment?: string;
  isFinal?: boolean;
}

interface ExportSubjectSummary {
  subject: string;
  grades: ExportGradeEntry[];
  avgPct: number;
}

interface ExportStudentInfo {
  name: string;
  className: string;
  moduleName?: string;
  modulePeriod?: string;
}

function registerFonts(doc: jsPDF) {
  // Шрифты регистрируются заново для каждого нового документа jsPDF —
  // каждый вызов new jsPDF() создаёт независимый VFS, поэтому глобальный
  // флаг "уже зарегистрировано" ломает кириллицу при повторном экспорте.
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}

const GARNET: [number, number, number] = [139, 26, 47];
const GARNET_DARK: [number, number, number] = [92, 15, 30];
const TEXT_DARK: [number, number, number] = [61, 21, 32];
const TEXT_MUTED: [number, number, number] = [155, 106, 122];
const BLUSH: [number, number, number] = [245, 224, 229];
const ROW_ALT: [number, number, number] = [253, 246, 238];

// Уровень успеваемости по проценту — соответствует шкале в приложении:
// экспертный 85-100%, высокий 70-84%, базовый 50-69%, ниже базового <50%
interface Level { label: string; text: [number, number, number]; bg: [number, number, number]; }
const LEVELS: Level[] = [
  { label: "Экспертный", text: [27, 94, 32], bg: [227, 243, 228] },
  { label: "Высокий", text: [92, 15, 30], bg: [245, 224, 229] },
  { label: "Базовый", text: [230, 81, 0], bg: [255, 235, 204] },
  { label: "Ниже базового", text: [183, 28, 28], bg: [253, 224, 224] },
];
function percentLevel(pct: number): Level {
  if (pct >= 85) return LEVELS[0];
  if (pct >= 70) return LEVELS[1];
  if (pct >= 50) return LEVELS[2];
  return LEVELS[3];
}

function drawPageHeader(doc: jsPDF, pageWidth: number, student: ExportStudentInfo, subject: string) {
  let cursorY = 14;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const infoLine = [student.name, student.className, student.moduleName].filter(Boolean).join(" · ");
  doc.text(infoLine, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 5;

  if (student.modulePeriod) {
    doc.setFontSize(8);
    doc.text(student.modulePeriod, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 5.5;
  } else {
    cursorY += 1.5;
  }

  doc.setFont("Roboto", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GARNET_DARK);
  doc.text(subject, pageWidth / 2, cursorY + 4, { align: "center" });
  cursorY += 12;

  doc.setDrawColor(...BLUSH);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 20, cursorY, pageWidth / 2 + 20, cursorY);
  cursorY += 8;

  return cursorY;
}

function drawFinalGradeBlock(doc: jsPDF, pageWidth: number, cursorY: number, avgPct: number, count: number): number {
  const level = percentLevel(avgPct);
  const boxWidth = 110;
  const boxHeight = 30;
  const boxX = (pageWidth - boxWidth) / 2;

  doc.setFillColor(...level.bg);
  doc.roundedRect(boxX, cursorY, boxWidth, boxHeight, 4, 4, "F");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...level.text);
  doc.text("ИТОГОВАЯ ОТМЕТКА ЗА МОДУЛЬ", pageWidth / 2, cursorY + 8, { align: "center" });

  doc.setFont("Roboto", "bold");
  doc.setFontSize(22);
  doc.text(`${avgPct}%`, pageWidth / 2, cursorY + 19, { align: "center" });

  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  doc.text(level.label, pageWidth / 2, cursorY + 26, { align: "center" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`на основе ${count} ${pluralGrades(count)}`, pageWidth / 2, cursorY + boxHeight + 6, { align: "center" });

  return cursorY + boxHeight + 12;
}

function pluralGrades(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "отметки";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "отметок";
  return "отметок";
}

function footer(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Сформировано ${new Date().toLocaleDateString("ru-RU")}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );
}

/**
 * Генерирует и скачивает PDF со сводкой успеваемости ученика по всем
 * предметам за учебный модуль — один лист A4 на каждый предмет:
 * таблица всех отметок и итоговая отметка (среднее значение за модуль)
 * с указанием уровня успеваемости (Экспертный/Высокий/Базовый/Ниже базового).
 */
export function exportGradesSummaryToPdf(student: ExportStudentInfo, subjects: ExportSubjectSummary[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  if (subjects.length === 0) {
    doc.setFont("Roboto", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...GARNET_DARK);
    doc.text(`Сводка успеваемости · ${student.name}`, pageWidth / 2, 20, { align: "center" });
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("За выбранный модуль отметок нет", pageWidth / 2, 32, { align: "center" });
    footer(doc, pageWidth, pageHeight);
    doc.save(`Сводка успеваемости ${student.name}.pdf`);
    return;
  }

  subjects.forEach((subj, index) => {
    if (index > 0) doc.addPage();

    let cursorY = drawPageHeader(doc, pageWidth, student, subj.subject);

    const sortedGrades = subj.grades;
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["Дата", "Отметка", "%", "Комментарий"]],
      body: sortedGrades.map(g => [g.date, g.label, `${g.percent}%`, g.isFinal ? `Итоговая${g.comment ? " · " + g.comment : ""}` : (g.comment || "—")]),
      styles: {
        font: "Roboto",
        fontSize: 9,
        textColor: TEXT_DARK,
        cellPadding: 2.4,
        valign: "middle",
        lineColor: [230, 210, 216],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: GARNET,
        textColor: [255, 255, 255],
        font: "Roboto",
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 24, halign: "center", fontStyle: "bold", textColor: GARNET_DARK },
        2: { cellWidth: 18, halign: "center", textColor: GARNET },
        3: { cellWidth: pageWidth - margin * 2 - 26 - 24 - 18 },
      },
      alternateRowStyles: { fillColor: ROW_ALT },
      theme: "grid",
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3 && sortedGrades[data.row.index]?.isFinal) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.textColor = GARNET_DARK;
        }
      },
    });

    // @ts-expect-error lastAutoTable добавляется в рантайме плагином jspdf-autotable
    cursorY = doc.lastAutoTable.finalY + 12;

    const blockHeight = 30 + 12;
    if (cursorY + blockHeight > pageHeight - 16) {
      doc.addPage();
      cursorY = 20;
    }

    drawFinalGradeBlock(doc, pageWidth, cursorY, subj.avgPct, sortedGrades.length);
    footer(doc, pageWidth, pageHeight);
  });

  doc.save(`Сводка успеваемости ${student.name}.pdf`);
}