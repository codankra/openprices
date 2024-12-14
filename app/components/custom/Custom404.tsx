import { Link } from "react-router";
import { Home } from "lucide-react";
import { GiTreasureMap } from "react-icons/gi";

const Custom404 = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center place-content-center m-auto px-4 mb-32">
      <GiTreasureMap className="w-32 h-32 mb-6 text-stone-600" />{" "}
      <h1 className="text-6xl font-bold text-stone-800 mb-4">404</h1>
      <p className="text-3xl font-semibold text-stone-700 mb-8">
        Page Not Found
      </p>
      <div className="bg-stone-200 p-8 rounded-lg shadow-lg">
        <p className="text-stone-600 mb-6">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-stone-600 rounded-md hover:bg-stone-700 transition duration-300 ease-in-out"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default Custom404;
