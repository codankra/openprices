import { Link, MetaFunction } from "react-router";
import HeaderLinks from "~/components/custom/HeaderLinks";
export const meta: MetaFunction = () => {
  return [
    { title: "Supported Stores" },
    {
      name: "description",
      content:
        "Stores where you can Upload the Receipt to Add Grocery Price History Data",
    },
  ];
};
export default function SupportedStores() {
  return (
    <div className="bg-ogprime flex flex-col items-center min-h-screen">
      {" "}
      <header className="w-full">
        <HeaderLinks />{" "}
      </header>
      <section className="flex-grow w-full max-w-4xl flex flex-col justify-center items-center h-full p-4 gap-4">
        <Link
          to="/upload-receipt"
          className="self-start p-2 flex gap-2 text-stone-700 hover:text-stone-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>{" "}
          Upload Receipt
        </Link>

        <div className="p-4 bg-white rounded-lg w-full">
          <h1 className="text-2xl font-bold mb-4">Supported Stores</h1>
          <p className="text-lg mb-6">
            We're building receipt parsing support based on demand. Here are our
            currrent supported stores:
          </p>
          <ul className="text-lg space-y-2">
            <li className="font-bold text-[#d21242]">Trader Joe's</li>
            <li className="font-bold text-[#ee2824]">H-E-B</li>
            <li className="font-bold text-[#005732]">Central Market</li>
            <li className="font-bold text-[#953235]">Mi Tienda</li>
            <li className="font-bold text-[#e1251b]">Joe V's Smart Shop</li>
          </ul>
        </div>
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg">
            Please share what stores you would like added to this list!
          </p>
          <div className="flex gap-4">
            <Link
              to="https://github.com/codankra/openprices/issues/new"
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Request on GitHub
            </Link>
            <Link
              to="https://x.com/thedanktoday"
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Request on X
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
