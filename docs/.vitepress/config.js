export default {
    base: "/testing-handbook/",
    lang: "et-EE",
    title: "Node.js Testimise Käsiraamat",
    description: "2-päevane moodul: testimise alused, TDD, mockimine, API testimine, Docker, Prisma",

    themeConfig: {
        nav: [
            { text: "Avaleht", link: "/" },
            { text: "Päev 1", link: "/day-1/introduction" },
            { text: "Päev 2", link: "/day-2/practical-api-testing" }
        ],

        sidebar: [
            {
                text: "Päev 1 – Teooria + Workshop",
                items: [
                    { text: "Sissejuhatus testimisse", link: "/day-1/introduction" },
                    { text: "Mockimine, arhitektuur ja Jest workshop", link: "/day-1/advanced-topics" }
                ]
            },
            {
                text: "Päev 2 – 100% praktiline",
                items: [
                    { text: "Scaffold projekti ülevaade", link: "/day-2/practical-api-testing" },
                    { text: "Ülesanded", link: "/day-2/practical-workshop" },
                ]
            }
        ],

        socialLinks: [
            { icon: "github", link: "https://github.com/vikatgen/testing-handbook/tree/master" }
        ],

        footer: {
            message: "Õppematerjal sisekasutuseks (Kuressaare Ametikool).",
            copyright: "©"
        }
    }
};
