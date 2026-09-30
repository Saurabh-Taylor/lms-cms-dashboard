import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  /** Presigned GET — null/undefined → color/initials fallback. */
  thumbnailUrl?: string | null;
  /** Accent color — also the fallback surface when no image exists. */
  thumbnailColor: string;
} & (
  | { variant: "banner"; title?: string }
  | { variant: "square"; size?: 8 | 10; title: string }
  | { variant: "dot"; title?: string }
);

/**
 * The course-thumbnail display contract — one seam for every surface.
 * `banner` slots are 16:9 (the recommended upload dims) so standard images
 * render uncropped; small slots keep an intentional center-crop.
 * Presigned R2 URLs use plain <img> — not next/image-optimizable.
 */
export function CourseThumbnail(props: Props) {
  const { thumbnailUrl, thumbnailColor } = props;

  if (props.variant === "banner")
    return thumbnailUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not optimizable
      <img src={thumbnailUrl} alt="" className="aspect-video w-full object-cover" />
    ) : (
      <div className="h-1.5" style={{ background: thumbnailColor }} aria-hidden />
    );

  if (props.variant === "square") {
    const size = props.size ?? 8;
    return thumbnailUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not optimizable
      <img
        src={thumbnailUrl}
        alt=""
        className={cn("shrink-0 object-cover", size === 10 ? "size-10 rounded-lg" : "size-8 rounded-md")}
      />
    ) : (
      <span
        className={cn(
          "grid shrink-0 place-items-center font-bold text-white",
          size === 10 ? "size-10 rounded-lg text-xs" : "size-8 rounded-md text-[10px]",
        )}
        style={{ background: thumbnailColor }}
      >
        {initials(props.title)}
      </span>
    );
  }

  return thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not optimizable
    <img src={thumbnailUrl} alt="" className="size-7 rounded-md object-cover" />
  ) : (
    <span className="size-2.5 rounded-full" style={{ background: thumbnailColor }} aria-hidden />
  );
}
