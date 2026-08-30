import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { NavLink, Outlet } from "react-router";
import { requireAuth } from "../services/auth.server";
import HeaderLinks from "~/components/custom/HeaderLinks";
import { User, History, TrendingUp } from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Guard every child route under /account/* in one place.
  await requireAuth(request, "/account");
  return null;
};

export const meta: MetaFunction = () => {
  return [
    { title: "Account Dashboard - Open Price Data" },
    {
      name: "description",
      content:
        "Contributions - Statistics - Settings of Your User Profile Section of Open Price Data",
    },
  ];
};

const sidebarItems = [
  {
    to: "/account",
    label: "Profile",
    icon: User,
    end: true,
  },
  {
    to: "/account/contribution-history",
    label: "Contribution History",
    icon: History,
    end: false,
  },
  {
    to: "/account/inflation",
    label: "Your Price Stats",
    icon: TrendingUp,
    end: false,
  },
];

export default function AccountLayout() {
  return (
    <div className="font-sans bg-ogprime min-h-screen">
      <header>
        <HeaderLinks />
      </header>
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-3xl mb-6">Your Account</h1>
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-md p-2 space-y-1 md:sticky md:top-4">
              {sidebarItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-ogfore text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main className="flex-1 min-w-0 space-y-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
