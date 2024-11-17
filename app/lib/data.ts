export type PriceSample = {
  month: string;
  price: number;
};
export type ProductPreview = {
  id: string;
  name: string;
  currentPrice: number;
  trend?: "up" | "down" | "stable";
  trendPc?: number;
  storeImg: string;
  prodImg: string;
};

export type FAQ = {
  question: string;
  answer: string;
};

export const samplePriceData: PriceSample[] = [
  {
    month: "Jan 2020",
    price: 405.625,
  },
  {
    month: "Feb 2020",
    price: 405.33,
  },
  {
    month: "Mar 2020",
    price: 414.77,
  },
  {
    month: "Apr 2020",
    price: 416.54,
  },
  {
    month: "May 2020",
    price: 434.83,
  },
  {
    month: "Jun 2020",
    price: 438.075,
  },
  {
    month: "Jul 2020",
    price: 441.025,
  },
  {
    month: "Aug 2020",
    price: 440.14,
  },
  {
    month: "Sep 2020",
    price: 443.385,
  },
  {
    month: "Oct 2020",
    price: 446.925,
  },
  {
    month: "Nov 2020",
    price: 453.71,
  },
  {
    month: "Dec 2020",
    price: 456.07,
  },
  {
    month: "Jan 2021",
    price: 453.415,
  },
  {
    month: "Feb 2021",
    price: 450.17,
  },
  {
    month: "Mar 2021",
    price: 445.45,
  },
  {
    month: "Apr 2021",
    price: 445.745,
  },
  {
    month: "May 2021",
    price: 445.45,
  },
  {
    month: "Jun 2021",
    price: 439.845,
  },
  {
    month: "Jul 2021",
    price: 432.765,
  },
  {
    month: "Aug 2021",
    price: 466.1,
  },
  {
    month: "Sep 2021",
    price: 450.17,
  },
  {
    month: "Oct 2021",
    price: 456.365,
  },
  {
    month: "Nov 2021",
    price: 451.94,
  },
  {
    month: "Dec 2021",
    price: 458.725,
  },
  {
    month: "Jan 2022",
    price: 465.51,
  },
  {
    month: "Feb 2022",
    price: 474.065,
  },
  {
    month: "Mar 2022",
    price: 475.54,
  },
  {
    month: "Apr 2022",
    price: 473.77,
  },
  {
    month: "May 2022",
    price: 498.845,
  },
  {
    month: "Jun 2022",
    price: 505.925,
  },
  {
    month: "Jul 2022",
    price: 518.02,
  },
  {
    month: "Aug 2022",
    price: 515.955,
  },
  {
    month: "Sep 2022",
    price: 535.13,
  },
  {
    month: "Oct 2022",
    price: 544.865,
  },
  {
    month: "Nov 2022",
    price: 552.535,
  },
  {
    month: "Dec 2022",
    price: 556.96,
  },
  {
    month: "Jan 2023",
    price: 559.32,
  },
  {
    month: "Feb 2023",
    price: 571.12,
  },
  {
    month: "Mar 2023",
    price: 586.755,
  },
  {
    month: "Apr 2023",
    price: 575.545,
  },
  {
    month: "May 2023",
    price: 571.415,
  },
  {
    month: "Jun 2023",
    price: 584.1,
  },
  {
    month: "Jul 2023",
    price: 581.15,
  },
  {
    month: "Aug 2023",
    price: 581.74,
  },
  {
    month: "Sep 2023",
    price: 590.59,
  },
  {
    month: "Oct 2023",
    price: 582.92,
  },
  {
    month: "Nov 2023",
    price: 597.08,
  },
  {
    month: "Dec 2023",
    price: 599.735,
  },
  {
    month: "Jan 2024",
    price: 591.77,
  },
  {
    month: "Feb 2024",
    price: 589.115,
  },
  {
    month: "Mar 2024",
    price: 589.41,
  },
  {
    month: "Apr 2024",
    price: 581.445,
  },
  {
    month: "May 2024",
    price: 582.035,
  },
  {
    month: "Jun 2024",
    price: 582.625,
  },
  {
    month: "Jul 2024",
    price: 586.755,
  },
  {
    month: "Aug 2024",
    price: 596.11,
  },
  {
    month: "Sep 2024",
    price: 594.875,
  },
  {
    month: "Oct 2024",
    price: 602.32,
  },
];

export const products: ProductPreview[] = [
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

export const faqs: FAQ[] = [
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
