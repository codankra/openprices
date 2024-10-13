import { Link } from "@remix-run/react";

const HeaderLinks = () => {
  return (
    <div className="text-stone-900 py-4 flex justify-evenly md:justify-between">
      <div className="flex items-center space-x-4 container mx-auto px-4 hover:text-stone-700">
        <Link to="/" className="flex items-center space-x-4">
          <img
            src="favicon.ico"
            width={40}
            height={40}
            alt="Open Price Data Logo"
            className="rounded"
          />
          <h1 className="text-2xl font-bold hidden md:block">
            Open Price Data
          </h1>
        </Link>
      </div>
      <div className="flex items-center container mx-auto px-4 mr-4 md:justify-end space-x-4 ">
        <Link to="/search" className="hover:text-stone-700">
          Browse
        </Link>
        <Link
          to="/upload-receipt"
          className="hover:text-stone-700 whitespace-nowrap"
        >
          Contribute Prices
        </Link>
        <Link to="/account" className="hover:text-stone-700">
          Account
        </Link>
      </div>
    </div>
  );
};

export default HeaderLinks;
