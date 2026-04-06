import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TideOps",
    short_name: "TideOps",
    description:
      "Attendance, safety check-ins, daily reports, and incident tracking for field teams.",
    start_url: "/attendance",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#0f766e",
  };
}
