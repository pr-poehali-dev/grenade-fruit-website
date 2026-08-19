import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./robotoFont";

interface ExportLesson {
  time_slot: string;
  subject: string;
  teacher_name: string;
  room: string;
}

interface ExportTeacherLesson {
  time_slot: string;
  subject: string;
  class_name: string;
  room: string;
}

interface ExportClassInfo {
  displayName: string;
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
const ROW_ALT: [number, number, number] = [253, 246, 238];
const EMPTY_CELL: [number, number, number] = [250, 250, 250];

const WEEK_DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
const DAY_SHORT: Record<string, string> = {
  "Понедельник": "Понедельник",
  "Вторник": "Вторник",
  "Среда": "Среда",
  "Четверг": "Четверг",
  "Пятница": "Пятница",
};

function collectTimeSlots(lessonsByDay: Record<string, { time_slot: string }[]>): string[] {
  const set = new Set<string>();
  WEEK_DAYS.forEach(day => (lessonsByDay[day] || []).forEach(l => set.add(l.time_slot)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function buildHeaderAndHead(doc: jsPDF, pageWidth: number, title: string, subtitle: string) {
  let cursorY = 14;
  doc.setFont("Roboto", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...GARNET_DARK);
  doc.text(title, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 5.5;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(subtitle, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;
  return cursorY;
}

function footer(doc: jsPDF, pageWidth: number) {
  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    `Сформировано ${new Date().toLocaleDateString("ru-RU")}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 6,
    { align: "center" }
  );
}

/**
 * Строит компактную сетку "Время × Дни недели" на одном листе A4 (альбомная
 * ориентация): каждая строка — учебное время, каждая колонка — день недели.
 * Такая компоновка гарантированно умещается на одну страницу вместо пяти
 * отдельных таблиц по дням.
 */
function buildGridTable(
  doc: jsPDF,
  cursorY: number,
  pageWidth: number,
  margin: number,
  timeSlots: string[],
  lessonsByDay: Record<string, { time_slot: string; subject: string; room: string; who: string }[]>
) {
  const timeColWidth = 24;
  const dayColWidth = (pageWidth - margin * 2 - timeColWidth) / WEEK_DAYS.length;

  const head = [["Время", ...WEEK_DAYS.map(d => DAY_SHORT[d])]];
  const body = timeSlots.map(slot => {
    const row: string[] = [slot];
    WEEK_DAYS.forEach(day => {
      const lessons = (lessonsByDay[day] || []).filter(l => l.time_slot === slot);
      if (lessons.length === 0) {
        row.push("");
      } else {
        row.push(lessons.map(l => `${l.subject}\n${l.who}${l.room ? " · " + l.room : ""}`).join("\n\n"));
      }
    });
    return row;
  });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head,
    body,
    styles: {
      font: "Roboto",
      fontSize: 8,
      textColor: TEXT_DARK,
      cellPadding: 1.8,
      valign: "middle",
      lineColor: [230, 210, 216],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: GARNET,
      textColor: [255, 255, 255],
      font: "Roboto",
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: timeColWidth, halign: "center", fontStyle: "bold", fontSize: 7.5, textColor: GARNET },
      1: { cellWidth: dayColWidth },
      2: { cellWidth: dayColWidth },
      3: { cellWidth: dayColWidth },
      4: { cellWidth: dayColWidth },
      5: { cellWidth: dayColWidth },
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    theme: "grid",
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0 && !data.cell.raw) {
        data.cell.styles.fillColor = EMPTY_CELL;
      }
    },
  });
}

/**
 * Генерирует и скачивает универсальный PDF-файл с расписанием на неделю
 * (Пн–Пт) по дням недели — компактная сетка на одном листе A4.
 */
export function exportWeekTemplateToPdf(
  classInfo: ExportClassInfo,
  moduleName: string | undefined,
  lessonsByDayOfWeek: Record<string, ExportLesson[]>
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const cursorY = buildHeaderAndHead(
    doc,
    pageWidth,
    `Расписание · ${classInfo.displayName}`,
    moduleName ? `Учебная неделя · ${moduleName}` : "Учебная неделя"
  );

  const timeSlots = collectTimeSlots(lessonsByDayOfWeek);
  const normalized: Record<string, { time_slot: string; subject: string; room: string; who: string }[]> = {};
  WEEK_DAYS.forEach(day => {
    normalized[day] = (lessonsByDayOfWeek[day] || []).map(l => ({
      time_slot: l.time_slot,
      subject: l.subject,
      room: l.room,
      who: l.teacher_name,
    }));
  });

  if (timeSlots.length === 0) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Уроки ещё не добавлены", pageWidth / 2, cursorY + 10, { align: "center" });
  } else {
    buildGridTable(doc, cursorY, pageWidth, margin, timeSlots, normalized);
  }

  footer(doc, pageWidth);
  doc.save(`Расписание ${classInfo.displayName}.pdf`);
}

/**
 * Генерирует и скачивает PDF-файл с личным расписанием учителя —
 * уроки во всех классах, где он преподаёт, в виде компактной сетки
 * "Время × Дни недели" на одном листе A4.
 */
export function exportTeacherScheduleToPdf(
  teacherName: string,
  lessonsByDayOfWeek: Record<string, ExportTeacherLesson[]>
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const cursorY = buildHeaderAndHead(doc, pageWidth, `Расписание · ${teacherName}`, "Учебная неделя");

  const timeSlots = collectTimeSlots(lessonsByDayOfWeek);
  const normalized: Record<string, { time_slot: string; subject: string; room: string; who: string }[]> = {};
  WEEK_DAYS.forEach(day => {
    normalized[day] = (lessonsByDayOfWeek[day] || []).map(l => ({
      time_slot: l.time_slot,
      subject: l.subject,
      room: l.room,
      who: l.class_name,
    }));
  });

  if (timeSlots.length === 0) {
    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Уроки ещё не добавлены", pageWidth / 2, cursorY + 10, { align: "center" });
  } else {
    buildGridTable(doc, cursorY, pageWidth, margin, timeSlots, normalized);
  }

  footer(doc, pageWidth);
  doc.save(`Расписание ${teacherName}.pdf`);
}
