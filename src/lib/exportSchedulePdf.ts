import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./robotoFont";

interface ExportLesson {
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

const WEEK_DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];

/**
 * Генерирует и скачивает универсальный PDF-файл с расписанием на неделю
 * (Пн–Пт) по дням недели, без привязки к конкретным календарным датам.
 */
export function exportWeekTemplateToPdf(
  classInfo: ExportClassInfo,
  moduleName: string | undefined,
  lessonsByDayOfWeek: Record<string, ExportLesson[]>
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
  doc.text(moduleName ? `Учебная неделя · ${moduleName}` : "Учебная неделя", pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  WEEK_DAYS.forEach(dayName => {
    const lessons = (lessonsByDayOfWeek[dayName] || []).slice().sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFillColor(...BLUSH);
    doc.roundedRect(14, cursorY - 5, pageWidth - 28, 8, 2, 2, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GARNET);
    doc.text(dayName, 17, cursorY);
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
