import { createFileRoute } from "@tanstack/react-router";
import Login from "@/components/login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Log In | Disaster Simulation & Intelligent Relief Allocation Platform",
      },
      {
        name: "description",
        content:
          "Authorized sign-in for administrators, disaster management authorities, and field coordinators.",
      },
      { property: "og:title", content: "Log In | Disaster Simulation & Intelligent Relief Allocation Platform" },
      {
        property: "og:description",
        content:
          "Authorized sign-in for administrators, disaster management authorities, and field coordinators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Login />;
}
