type DateValue = string | Date | null | undefined;

const monthNames = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function formatDateParts(year: number, monthIndex: number, day: number): string {
  const dayText = String(day).padStart(2, "0");
  const yearText = String(year).slice(-2);

  return `${dayText}-${monthNames[monthIndex]}-${yearText}`;
}

function parseDate(value: DateValue): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: DateValue): string {
  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      const validatedDate = new Date(Date.UTC(year, month - 1, day));

      if (
        validatedDate.getUTCFullYear() !== year
        || validatedDate.getUTCMonth() !== month - 1
        || validatedDate.getUTCDate() !== day
      ) {
        return "";
      }

      return formatDateParts(year, month - 1, day);
    }
  }

  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return formatDateParts(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateTime(value: DateValue): string {
  const date = parseDate(value);
  const formattedDate = formatDate(value);

  if (!date || !formattedDate) {
    return formattedDate;
  }

  const formattedTime = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${formattedDate} ${formattedTime}`;
}

const dateService = {
  formatDate,
  formatDateTime,
};

export default dateService;