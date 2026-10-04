import type { GuestStatusHistoryPart } from "@/services/guestStatusesService";

type HistoryActivityProps = {
  parts: GuestStatusHistoryPart[];
};

const partClassNames = {
  text: "",
  user: "italic",
  guest: "font-medium text-blue-900",
  room: "font-bold",
};

export default function HistoryActivity({ parts }: HistoryActivityProps) {
  const renderedParts = parts.map((part, index) => ({
    key: index,
    className: partClassNames[part.type],
    text: part.text,
  }));

  return (
    <>
      {renderedParts.map((part) => (
        <span key={part.key} className={part.className}>{part.text}</span>
      ))}
    </>
  );
}