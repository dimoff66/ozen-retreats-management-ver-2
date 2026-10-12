import type { GuestStatusHistoryPart } from "@/services/guestStatusesService";

type HistoryActivityProps = {
  parts: GuestStatusHistoryPart[];
};

const partClassNames = {
  text: "project-history-text",
  user: "project-history-user",
  guest: "project-history-guest",
  room: "project-history-room",
};

export default function HistoryActivity({ parts }: HistoryActivityProps) {
  const renderedParts = parts.map((part, index) => ({
    key: index,
    className: partClassNames[part.type],
    text: part.text,
  }));

  return (
    <>
      {renderedParts.map(part => (
        <span key={part.key} className={part.className}>{part.text}</span>
      ))}
    </>
  );
}