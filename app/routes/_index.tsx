import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { json, type LoaderFunction, type MetaFunction } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FaSearch, FaArrowRight } from "react-icons/fa";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AnimatedText } from "~/components/ui/animations";
import { ChartConfig, ChartContainer } from "~/components/ui/chart";
import { samplePriceData, type PriceSample } from "~/lib/data";

type Product = {
  id: string;
  name: string;
  currentPrice: number;
  image: string;
};

type FAQ = {
  question: string;
  answer: string;
};

type LoaderData = {
  products: Product[];
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
  // In a real application, you would fetch this data from a database or API
  const products: Product[] = [
    {
      id: "1",
      name: "Costco Hot Dog",
      currentPrice: 1.5,
      image: "/placeholder.ico",
    },
    {
      id: "2",
      name: "Trader Joe's Sparkling Water",
      currentPrice: 0.99,
      image: "/placeholder.ico",
    },
    {
      id: "3",
      name: "HEB Lemon Juice",
      currentPrice: 2.49,
      image: "/placeholder.ico",
    },
    {
      id: "4",
      name: "CVS Hallmark Card",
      currentPrice: 3.99,
      image: "/placeholder.ico",
    },
  ];
  const faqs: FAQ[] = [
    {
      question: "What's the purpose of open price data?",
      answer:
        "Have you noticed that the change in your gas or grocery bill doesn't match the government-reported inflation rate? So it doesn't seem right for government agencies to be the main source for tracking price changes. Instead, we hope open price data can serve as a more accurate, crowdsourced, uncorruptable record of real current and historical prices - fueled by contributions on products us consumers actually buy.",
    },
    {
      question: "Do I need an account to use this site?",
      answer:
        "No account is needed to browse, but you'll need one to contribute data.",
    },
    {
      question: "How is Open Price Data 'open'?",
      answer:
        "It's open for anyone to create an account and contribute, and the code is open source on GitHub (link here).",
    },
    {
      question: "How can I support Open Price Data?",
      answer:
        "We welcome your contribution in any way! Here are three options:\n\n1. Contribute to the site by adding price data\n2. Help with the codebase by contributing to our open-source project\n3. Donate to the site owner through our <a href='https://ko-fi.com/thedank' target='_blank' rel='noopener noreferrer'>Ko-fi page</a>",
    },
  ];

  return json<LoaderData>({ products, faqs, samplePriceData });
};

export default function Index() {
  const { products, faqs, samplePriceData } = useLoaderData<LoaderData>();
  const [searchTerm, setSearchTerm] = useState("");

  // const [key, setKey] = useState(0);

  // useEffect(() => {
  //   // This effect will run on each hot reload
  //   setKey((prevKey) => prevKey + 1);
  // }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-ogprime text-stone-900 py-4">
        <div className="flex items-center space-x-4 container mx-auto px-4 hover:text-stone-700">
          <Link to="/" className="flex items-center space-x-4">
            <img
              src="favicon.ico"
              width={40}
              height={40}
              alt="Open Price Data Logo"
              className="rounded"
            />
            <h1 className="text-2xl font-bold">Open Price Data</h1>
          </Link>
        </div>
      </header>

      <main>
        <section className="bg-ogprime text-stone-700 py-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center">
              <div className="w-full lg:w-1/2 text-center lg:text-left mb-8 lg:mb-0">
                <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold mb-6">
                  How Have Prices Really Changed?
                </h2>
                <p className="text-xl md:text-3xl text-stone-600 mb-8">
                  Explore Crowdsourced Data
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
                    placeholder="Search for a product"
                    className="px-4 py-2 w-64 text-stone-900 rounded-l-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                    aria-label="Search for a product"
                  />
                  <button
                    type="submit"
                    className="bg-ogfore text-stone-700 px-4 py-2 rounded-r-md hover:bg-ogfore-hover focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                    // key={key}
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
              Featured Products
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-4">
                      Current Avg. Price: ${product.currentPrice.toFixed(2)}
                    </p>
                    <Link
                      to={`/product/${product.id}`}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      View Details
                      <FaArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible>
                {faqs.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
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
