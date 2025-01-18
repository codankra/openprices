import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { type MetaFunction } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AnimatedText } from "~/components/custom/animations";
import HeaderLinks from "~/components/custom/HeaderLinks";
import ProductDetailsCard from "~/components/custom/ProductDetailsCard";
import { ChartConfig, ChartContainer } from "~/components/ui/chart";
import { faqs, products, samplePriceData } from "~/lib/data";

const chartConfig = {
  price: {
    label: "$USD",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const meta: MetaFunction = () => {
  return [
    { title: "Open Price Data | Track Real Consumer Cost History" },
    {
      name: "description",
      content:
        "Explore crowdsourced open food price data to see real costs change over time. Join our community in tracking accurate, transparent food price trends.",
    },
    { tagName: "link", rel: "canonical", href: "https://openpricedata.com" },
    {
      property: "og:title",
      content: "Open Price Data | Crowdsourced History of Real Consumer Prices",
    },
    {
      property: "og:description",
      content:
        "Track true crowdsourced prices on the Open Price Data platform. See how everyday costs really change over time.",
    },
    {
      property: "og:url",
      content: "https://openpricedata.com",
    },
  ];
};
export const loader = async () => {
  return { products, faqs, samplePriceData };
};

export default function Index() {
  const { products, faqs, samplePriceData } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-ogprime ">
        <HeaderLinks />
      </header>

      <main>
        <section className="bg-ogprime text-stone-700 py-14 sm:py-40">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row items-center">
              <div className="w-full lg:w-1/2 text-center lg:text-left mb-8 lg:mb-0 px-10">
                <h2 className="text-3xl  md:text-4xl xl:text-4xl font-bold mb-6">
                  How Have Prices Really Changed?
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-stone-600 mb-8">
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
                    className="shadow bg-ogfore text-stone-700 px-4 py-2 rounded-r-md hover:bg-ogfore-hover focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                    aria-label="Search"
                  >
                    <FaSearch className="w-5 h-5" />
                  </button>
                </Form>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="sm:mr-8 mr-10 lg:mr-1 px-4 sm:px-10">
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
                <p className="text-center text-ogfore text-xs sm:ml-4 lg:ml-8 w-4/6 sm:w-full mx-auto">
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
                <ProductDetailsCard product={product} key={product.id} />
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
