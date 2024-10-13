import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { useState } from "react";
import { FaSearch, FaArrowRight } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AnimatedText } from "~/components/custom/animations";
import HeaderLinks from "~/components/custom/HeaderLinks";
import { ChartConfig, ChartContainer } from "~/components/ui/chart";
import { samplePriceData, type PriceSample } from "~/lib/data";

type ProductPreview = {
  id: string;
  name: string;
  currentPrice: number;
  trend?: "up" | "down" | "stable";
  trendPc?: number;
  storeImg: string;
  prodImg: string;
};

type FAQ = {
  question: string;
  answer: string;
};

type LoaderData = {
  products: ProductPreview[];
  faqs: FAQ[];
  samplePriceData: PriceSample[];
};

const chartConfig = {
  price: {
    label: "$USD",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const meta: MetaFunction = () => {
  return [
    { title: "Open Price Data" },
    { name: "description", content: "Open Price Data" },
  ];
};
export const loader: LoaderFunction = async () => {
  const products: ProductPreview[] = [
    {
      id: "1",
      name: "Costco Hot Dog & Soda",
      currentPrice: 1.5,
      trend: "stable",
      storeImg: "/homepage/costco.png",
      prodImg: "/homepage/hotdog.webp",
    },
    {
      id: "4",
      name: "Banana, each",
      currentPrice: 0.23,
      trend: "up",
      trendPc: 17,
      storeImg: "/homepage/traderjoes.png",
      prodImg: "/homepage/banana.jpg",
    },
    {
      id: "5",
      name: "Sparkling Water",
      currentPrice: 0.99,
      trend: "stable",
      storeImg: "/homepage/traderjoes.png",
      prodImg: "/homepage/swater.jpg",
    },
    {
      id: "2",
      name: "Dawn Platinum Liquid Dish Soap",
      currentPrice: 11.99,
      trend: "up",
      trendPc: 8,
      storeImg: "/homepage/costco.png",
      prodImg: "/homepage/dawn.webp",
    },
  ];
  const faqs: FAQ[] = [
    {
      question: "What's the purpose of open price data?",
      answer:
        "<div>Have you noticed that the change in your gas or grocery bill doesn't match the government-reported inflation rate?<br /><br />We hope open price data can serve as a more <strong>accurate, crowdsourced, uncorruptable record of real current and historical prices</strong> - fueled by contributions on products us consumers actually buy. Let's see how this experiment plays out!</div>",
    },
    {
      question: "Do I need an account to use this site?",
      answer:
        "No account is needed to browse, but you'll need one to contribute data (to prevent spam and abuse).",
    },
    {
      question: "How is Open Price Data 'open'?",
      answer:
        "It's open for anyone to see and contribute price data, much more than can be said for government data sources. <br /> <br /> My hope is also to open source future stable services the website will use, so if I develop a budgeting tool for example people can just run that locally/independently.",
    },
    //  If you're seeing this I believe in FOSS - I can't guarentee to open source all site/product development always but for the moment, the core website code is <a href='https://github.com/codankra/openprices' target='_blank' rel='noopener noreferrer' style='color: blue;'>open source on GitHub</a>. (Contributions Welcome!)
    {
      question: "How can I support Open Price Data?",
      answer:
        "<div>We welcome your contribution in any way! Here are three options:<br /><br /><ol><li>&emsp;1. Contribute to the site by adding price data</li><li>&emsp;2. Spread the word about project to friends and family</li><li>&emsp;3. Support to the site maintainer through our <a href='https://ko-fi.com/thedank' target='_blank' rel='noopener noreferrer' style='color: blue;'>Ko-fi page</a></li></div>",
    },
  ];

  return json<LoaderData>({ products, faqs, samplePriceData });
};

export default function Index() {
  const { products, faqs, samplePriceData } = useLoaderData<LoaderData>();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-ogprime ">
        <HeaderLinks />
      </header>

      <main>
        <section className="bg-ogprime text-stone-700 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center">
              <div className="w-full lg:w-1/2 text-center lg:text-left mb-8 lg:mb-0">
                <h2 className="text-4xl md:text-5xl xl:text-5xl font-bold mb-6">
                  How Have Prices Really Changed?
                </h2>
                <p className="text-xl md:text-2xl text-stone-600 mb-8">
                  See the True Everyday Costs Reported in your Community{" "}
                </p>
                <Form
                  method="get"
                  action="/search"
                  className="flex justify-center lg:justify-start"
                >
                  <input
                    type="text"
                    name="q"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Open Price Data"
                    className="shadow px-4 py-2 w-5/6 md:w-4/6 text-stone-900 rounded-l-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                    aria-label="Search for a product on Open Price Data"
                  />
                  <button
                    type="submit"
                    className="shadow bg-ogfore text-stone-700 px-4 py-2 rounded-r-md hover:bg-ogfore-hover focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    aria-label="Search"
                  >
                    <FaSearch className="w-5 h-5" />
                  </button>
                </Form>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="mr-8 lg:mr-1">
                  <ChartContainer
                    config={chartConfig}
                    className="min-h-[200px] w-full"
                  >
                    <AreaChart accessibilityLayer data={samplePriceData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <Area
                        dataKey="price"
                        type="natural"
                        fill="var(--color-price)"
                        fillOpacity={0.4}
                        stroke="var(--color-price)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
                <p className="text-center text-ogfore text-xs ml-4 lg:ml-16">
                  <AnimatedText
                    hold={1500}
                    transition={500}
                    text="■ Tot. Cost of Food and Drink for 1 Person, Sample CPM (in USD)"
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Recent Products
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              {products.map((product) => (
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
                      <p className="text-gray-600 text-sm">
                        ${product.currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <FaArrowRight className="self-end w-4 h-4 text-stone-600 flex-shrink-0" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-stone-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible>
                {faqs.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>
                      <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-stone-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>
            &copy; {new Date().getFullYear()} Daniel Kramer. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
