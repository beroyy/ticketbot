import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export function formatTicketDate(dateString: string | Date): string {
  return dayjs(dateString).format("D MMM YY");
}

export function formatTimestamp(dateString: string | Date): string {
  return dayjs(dateString).format("h:mm A");
}

export function formatFullDate(dateString: string | Date): string {
  return dayjs(dateString).format("M/D/YYYY");
}

export function formatMonthDay(dateString: string | Date): string {
  return dayjs(dateString).format("MMM D, YYYY");
}

export function formatAge(days: number): string {
  if (days < 30) return `${String(days)} days`;
  if (days < 365) return `${String(Math.floor(days / 30))} months`;
  return `${String(Math.floor(days / 365))} years`;
}

export function parseTicketDate(
  dateValue: string | Date,
  formats = ["YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss.SSSZ", "D MMM YY", "DD MMM YY"]
): dayjs.Dayjs {
  let parsedDate = dayjs(dateValue, formats, true);

  if (!parsedDate.isValid()) {
    parsedDate = dayjs();
  }

  return parsedDate;
}
