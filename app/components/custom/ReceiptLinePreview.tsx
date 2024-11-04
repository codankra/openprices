import { draftItems } from "~/db/schema";

export default function ReceiptLinePreview({
  imageUrl,
  item,
}: {
  imageUrl: string;
  item: typeof draftItems.$inferSelect;
}) {
  const padding = 10;
  const style = {
    position: "relative" as const,
    width: `${item.maxX - item.minX + padding * 2}px`,
    height: `${item.maxY - item.minY + padding * 2}px`,
    overflow: "hidden",
  };

  const imageStyle = {
    position: "absolute" as const,
    left: `${-item.minX + padding}px`,
    top: `${-item.minY + padding}px`,
    maxWidth: "none",
  };

  return (
    <div style={style}>
      <img
        src={imageUrl}
        style={imageStyle}
        alt={`Receipt item: ${item.receiptText}`}
      />
    </div>
  );
}
