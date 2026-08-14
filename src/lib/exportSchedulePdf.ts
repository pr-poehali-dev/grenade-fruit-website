import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./robotoFont";

interface ExportLesson {
  lesson_date?: string;
  day_of_week: string;
  time_slot: string;
  subject: string;
  teacher_name: string;
  room: string;
}

interface ExportClassInfo {
  displayName: string;
}

let fontsRegistered = false;

function registerFonts(doc: jsPDF) {
  if (!fontsRegistered) {
    doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD_BASE64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    fontsRegistered = true;
  }
  doc.setFont("Roboto", "normal");
}

const GARNET: [number, number, number] = [139, 26, 47];
const GARNET_DARK: [number, number, number] = [92, 15, 30];
const BLUSH: [number, number, number] = [245, 224, 229];
const TEXT_DARK: [number, number, number] = [61, 21, 32];
const TEXT_MUTED: [number, number, number] = [155, 106, 122];

/**
 * Генерирует и скачивает PDF-файл с недельным расписанием класса.
 */
export function exportWeekScheduleToPdf(
  classInfo: ExportClassInfo,
  weekDates: { iso: string; dayName: string }[],
  lessonsByDay: Record<string, ExportLesson[]>
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 18;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GARNET_DARK);
  doc.text(`Расписание · ${classInfo.displayName}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  const rangeLabel = weekDates.length
    ? `${formatRuDate(weekDates[0].iso)} — ${formatRuDate(weekDates[weekDates.length - 1].iso)}`
    : "";
  doc.text(rangeLabel, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  weekDates.forEach(({ iso, dayName }) => {
    const lessons = (lessonsByDay[iso] || []).slice().sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFillColor(...BLUSH);
    doc.roundedRect(14, cursorY - 5, pageWidth - 28, 8, 2, 2, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GARNET);
    doc.text(`${dayName} · ${formatRuDate(iso)}`, 17, cursorY);
    cursorY += 6;

    if (lessons.length === 0) {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Нет уроков", 17, cursorY + 3);
      cursorY += 10;
      return;
    }

    autoTable(doc, {
      startY: cursorY,
      margin: { left: 14, right: 14 },
      head: [["Время", "Предмет", "Учитель", "Кабинет"]],
      body: lessons.map(l => [l.time_slot, l.subject, l.teacher_name, l.room || "—"]),
      styles: { font: "Roboto", fontSize: 9, textColor: TEXT_DARK, cellPadding: 2.2 },
      headStyles: { fillColor: GARNET, textColor: [255, 255, 255], font: "Roboto", fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 246, 238] },
      theme: "grid",
    });

    // @ts-expect-error lastAutoTable is added at runtime by jspdf-autotable
    cursorY = doc.lastAutoTable.finalY + 8;
  });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Сформировано ${new Date().toLocaleDateString("ru-RU")}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" }
  );

  doc.save(`Расписание ${classInfo.displayName}.pdf`);
}

/**
 * Генерирует и скачивает PDF-файл с расписанием модуля (по конкретным датам).
 */
export function exportModuleScheduleToPdf(
  classInfo: ExportClassInfo,
  moduleName: string,
  dates: string[],
  lessonsByDay: Record<string, ExportLesson[]>,
  specialByDay: Record<string, { emoji: string; label: string }>
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let cursorY = 18;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GARNET_DARK);
  doc.text(`Расписание · ${classInfo.displayName}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(moduleName, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  dates.forEach(iso => {
    const special = specialByDay[iso];
    const lessons = (lessonsByDay[iso] || []).slice().sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    const dayName = new Date(iso).toLocaleDateString("ru-RU", { weekday: "long" });
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFillColor(...BLUSH);
    doc.roundedRect(14, cursorY - 5, pageWidth - 28, 8, 2, 2, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GARNET);
    doc.text(`${dayNameCap} · ${formatRuDate(iso)}`, 17, cursorY);
    cursorY += 6;

    if (special) {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`${special.emoji} ${special.label}`, 17, cursorY + 3);
      cursorY += 10;
      return;
    }

    if (lessons.length === 0) {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Нет уроков", 17, cursorY + 3);
      cursorY += 10;
      return;
    }

    autoTable(doc, {
      startY: cursorY,
      margin: { left: 14, right: 14 },
      head: [["Время", "Предмет", "Учитель", "Кабинет"]],
      body: lessons.map(l => [l.time_slot, l.subject, l.teacher_name, l.room || "—"]),
      styles: { font: "Roboto", fontSize: 9, textColor: TEXT_DARK, cellPadding: 2.2 },
      headStyles: { fillColor: GARNET, textColor: [255, 255, 255], font: "Roboto", fontStyle: "bold" },
      alternateRowStyles: { fillColor: [253, 246, 238] },
      theme: "grid",
    });

    // @ts-expect-error lastAutoTable is added at runtime by jspdf-autotable
    cursorY = doc.lastAutoTable.finalY + 8;
  });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Сформировано ${new Date().toLocaleDateString("ru-RU")}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: "center" }
  );

  doc.save(`Расписание ${classInfo.displayName} — ${moduleName}.pdf`);
}

function formatRuDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}
