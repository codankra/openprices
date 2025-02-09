import { FaBookOpenReader } from "react-icons/fa6";
import { NavLink, useLocation } from "react-router";

const HeaderLinks = () => {
  const location = useLocation();
  const isContributePath =
    location.pathname === "/upload-receipt" ||
    location.pathname === "/price-entry";
  return (
    <nav className="text-stone-900 p-4 sm:px-20 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <NavLink
          to="/"
          className="flex items-center space-x-4 transition duration-200 hover:text-stone-700"
        >
          <img
            src="/favicon.ico"
            width={40}
            height={40}
            alt="Open Price Data Logo"
            className="rounded min-w-10"
          />
          <h1 className="text-2xl font-bold hidden md:block leading-tight">
            Open Price Data
          </h1>
        </NavLink>
      </div>
      <div className="flex items-center space-x-8">
        <NavLink
          to="/search"
          className={({ isActive }) =>
            `font-medium tracking-wide leading-relaxed relative after:content-[''] after:absolute after:w-full after:h-[2px] after:bg-ogfore after:left-0 after:-bottom-1 after:rounded-full after:origin-left ${
              isActive ? "after:scale-x-100" : "after:scale-x-0"
            } hover:after:scale-x-100 after:transition-transform after:duration-300 hover:text-stone-800`
          }
        >
          Browse
        </NavLink>
        <NavLink
          to="/upload-receipt"
          className={({ isActive }) =>
            `font-medium tracking-wide leading-relaxed relative after:content-[''] after:absolute after:w-full after:h-[2px] after:bg-ogfore after:left-0 after:-bottom-1 after:rounded-full after:origin-left ${
              isActive || isContributePath
                ? "after:scale-x-100"
                : "after:scale-x-0"
            } hover:after:scale-x-100 after:transition-transform after:duration-300 hover:text-stone-800`
          }
        >
          Contribute
        </NavLink>
        <NavLink
          to="/account"
          className={({ isActive }) =>
            `flex items-center justify-center w-10 h-10 rounded-full bg-ogfore hover:bg-ogfore-hover transition-colors duration-300 text-white ${
              isActive ? "bg-ogfore-hover" : ""
            }`
          }
          title="Account"
        >
          <FaBookOpenReader className="w-5 h-5" />{" "}
        </NavLink>
      </div>
    </nav>
  );
};

export default HeaderLinks;
