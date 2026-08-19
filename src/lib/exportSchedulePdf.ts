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

const SUBJECT_FONT_SIZE = 9.5;
const INFO_FONT_SIZE = 6.5;
const LESSON_GAP_MM = 1.4;

function mmLineHeight(doc: jsPDF, fontSizePt: number): number {
  const scaleFactor = doc.internal.scaleFactor;
  const lineHeightFactor = doc.getLineHeightFactor ? doc.getLineHeightFactor() : 1.15;
  return (fontSizePt / scaleFactor) * lineHeightFactor;
}

interface CellLesson { subject: string; who: string; room: string; }
interface CellBlock { subjectLines: string[]; infoLines: string[]; height: number; }

/**
 * Считает раскладку строк (название урока крупным жирным шрифтом отдельно
 * от учителя/класса и кабинета мелким) и суммарную высоту содержимого
 * ячейки — используется и для измерения нужной высоты строки, и для
 * последующей отрисовки, чтобы оба расчёта совпадали.
 */
function measureCellBlocks(doc: jsPDF, lessons: CellLesson[], maxWidth: number): { blocks: CellBlock[]; totalHeight: number } {
  doc.setFont("Roboto", "bold");
  doc.setFontSize(SUBJECT_FONT_SIZE);
  const subjectLineHeight = mmLineHeight(doc, SUBJECT_FONT_SIZE);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(INFO_FONT_SIZE);
  const infoLineHeight = mmLineHeight(doc, INFO_FONT_SIZE);

  const blocks: CellBlock[] = lessons.map(l => {
    doc.setFont("Roboto", "bold");
    doc.setFontSize(SUBJECT_FONT_SIZE);
    const subjectLines: string[] = maxWidth > 0 ? doc.splitTextToSize(l.subject, maxWidth) : [l.subject];
    const infoText = [l.who, l.room].filter(Boolean).join(" · ");
    doc.setFont("Roboto", "normal");
    doc.setFontSize(INFO_FONT_SIZE);
    const infoLines: string[] = infoText && maxWidth > 0 ? doc.splitTextToSize(infoText, maxWidth) : infoText ? [infoText] : [];
    const height = subjectLines.length * subjectLineHeight + infoLines.length * infoLineHeight;
    return { subjectLines, infoLines, height };
  });

  const totalHeight = blocks.reduce((sum, b) => sum + b.height, 0) + LESSON_GAP_MM * Math.max(0, blocks.length - 1);
  return { blocks, totalHeight };
}

/**
 * Рисует содержимое ячейки вручную: название урока — крупным жирным
 * шрифтом, учитель/класс и кабинет — мелким обычным, по центру ячейки.
 * Используется вместо стандартного текста autoTable, чтобы получить
 * разные размеры шрифта внутри одной ячейки таблицы.
 */
function drawCellLessons(
  doc: jsPDF,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  lessons: CellLesson[],
  padding: number
) {
  const maxWidth = cellWidth - padding * 2;
  if (maxWidth <= 0 || lessons.length === 0) return;

  const subjectLineHeight = mmLineHeight(doc, SUBJECT_FONT_SIZE);
  const infoLineHeight = mmLineHeight(doc, INFO_FONT_SIZE);
  const { blocks, totalHeight } = measureCellBlocks(doc, lessons, maxWidth);
  let cursorY = cellY + (cellHeight - totalHeight) / 2;

  blocks.forEach((block, i) => {
    doc.setFont("Roboto", "bold");
    doc.setFontSize(SUBJECT_FONT_SIZE);
    doc.setTextColor(...GARNET_DARK);
    block.subjectLines.forEach(line => {
      cursorY += subjectLineHeight;
      doc.text(line, cellX + cellWidth / 2, cursorY - subjectLineHeight * 0.28, { align: "center" });
    });

    doc.setFont("Roboto", "normal");
    doc.setFontSize(INFO_FONT_SIZE);
    doc.setTextColor(...TEXT_MUTED);
    block.infoLines.forEach(line => {
      cursorY += infoLineHeight;
      doc.text(line, cellX + cellWidth / 2, cursorY - infoLineHeight * 0.28, { align: "center" });
    });

    if (i < blocks.length - 1) cursorY += LESSON_GAP_MM;
  });
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
 * отдельных таблиц по дням. Название урока рисуется отдельно поверх ячейки
 * крупным жирным шрифтом, чтобы визуально выделяться среди прочей информации.
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
  const cellPadding = 1.8;

  const head = [["Время", ...WEEK_DAYS.map(d => DAY_SHORT[d])]];
  const body = timeSlots.map(slot => {
    const row: string[] = [slot];
    WEEK_DAYS.forEach(() => row.push(""));
    return row;
  });

  const cellLessonsByPos = new Map<string, CellLesson[]>();
  timeSlots.forEach((slot, rowIndex) => {
    WEEK_DAYS.forEach((day, dayIndex) => {
      const lessons = (lessonsByDay[day] || []).filter(l => l.time_slot === slot);
      if (lessons.length > 0) {
        cellLessonsByPos.set(`${rowIndex}:${dayIndex + 1}`, lessons.map(l => ({ subject: l.subject, who: l.who, room: l.room })));
      }
    });
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
      cellPadding,
      valign: "middle",
      lineColor: [230, 210, 216],
      lineWidth: 0.15,
      minCellHeight: 15,
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
      if (data.section !== "body" || data.column.index === 0) return;
      const lessons = cellLessonsByPos.get(`${data.row.index}:${data.column.index}`);
      if (!lessons) {
        data.cell.styles.fillColor = EMPTY_CELL;
        return;
      }
      const maxWidth = dayColWidth - cellPadding * 2;
      const { totalHeight } = measureCellBlocks(doc, lessons, maxWidth);
      data.cell.styles.minCellHeight = totalHeight + cellPadding * 2;
    },
    willDrawCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const lessons = cellLessonsByPos.get(`${data.row.index}:${data.column.index}`);
      if (!lessons) return;
      data.cell.text = [];
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const lessons = cellLessonsByPos.get(`${data.row.index}:${data.column.index}`);
      if (!lessons) return;
      drawCellLessons(doc, data.cell.x, data.cell.y, data.cell.width, data.cell.height, lessons, cellPadding);
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