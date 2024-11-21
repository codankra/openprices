import { NavLink } from "@remix-run/react";

const HeaderLinks = () => {
  return (
    <nav className="text-stone-900 py-4 sm:px-20 flex justify-between items-center">
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
              isActive ? "after:scale-x-100" : "after:scale-x-0"
            } hover:after:scale-x-100 after:transition-transform after:duration-300 hover:text-stone-800`
          }
        >
          Contribute
        </NavLink>
        <NavLink
          to="/account"
          className={({ isActive }) =>
            `font-medium tracking-wide whitespace-nowrap relative after:content-[''] after:absolute after:w-full after:h-[2px] after:bg-ogfore after:left-0 after:-bottom-1 after:rounded-full after:origin-left ${
              isActive ? "after:scale-x-100" : "after:scale-x-0"
            } hover:after:scale-x-100 after:transition-transform after:duration-300 hover:text-stone-800`
          }
        >
          Account
        </NavLink>
      </div>
    </nav>
  );
};

export default HeaderLinks;
