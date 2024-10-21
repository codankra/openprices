import { Link } from "@remix-run/react";
import { FaArrowRight, FaArrowTrendUp } from "react-icons/fa6";
import { ProductPreview } from "~/lib/data";

type ProductDetailsProps = {
  product: ProductPreview;
};

export default function ProductDetailsCard(props: ProductDetailsProps) {
  const { product } = props;
  return (
    <div
      key={product.id}
      className="bg-stone-100 border-black border-1 rounded-lg shadow-md overflow-hidden flex flex-col p-4 hover:shadow-xl transition-shadow transform hover:scale-105 relative"
    >
      <div className="absolute top-2 right-2 flex items-center">
        {product.trend === "up" && (
          <span className="font-semibold text-ogfore flex items-center space-x-1">
            <span>{product.trendPc && `${product.trendPc}%`}</span>
            <FaArrowTrendUp className="text-ogfore" />
          </span>
        )}
        {product.trend === "stable" && (
          <span className="font-semibold text-black text-sm flex items-center space-x-1">
            <span>Stable</span>
          </span>
        )}
      </div>
      <Link
        to={`/product/${product.id}`}
        className="flex flex-grow items-center justify-center w-full text-inherit no-underline"
      >
        <div className="relative mt-4 mr-2 w-24 h-22 flex-shrink-0">
          <img
            src={product.prodImg}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-full mb-4"
          />
          <img
            src={product.storeImg}
            alt="Store logo"
            className="absolute bottom-0 right-0 w-12 h-12 p-1 mr-2 object-contain rounded-full bg-white shadow-sm"
          />
        </div>
        <div className="flex-grow">
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-stone-600 text-sm">
            ${product.currentPrice.toFixed(2)}
          </p>
        </div>
        <FaArrowRight className="self-end w-4 h-4 text-stone-600 flex-shrink-0" />
      </Link>
    </div>
  );
}
