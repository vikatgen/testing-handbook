export default {
    base: "/testing-handbook/",
    lang: "et-EE",
    title: "Node.js Testimise Käsiraamat",
    description: "2-päevane moodul: testimise alused, TDD, mockimine, API testimine, Docker, Prisma",

    themeConfig: {
        nav: [
            { text: "Avaleht", link: "/" },
            { text: "Päev 1", link: "/day-1/introduction" },
            { text: "Päev 2", link: "/day-2/practical-workshop" }
        ],

        sidebar: [
            {
                text: "Päev 1 – Teooria + Workshop",
                items: [
                    { text: "Sissejuhatus testimisse", link: "/day-1/introduction" },
                    { text: "Edasijõudnud teemad", link: "/day-1/advanced-topics" }
                ]
            },
            {
                text: "Päev 2 – 100% praktiline",
                items: [
                    { text: "Praktiline töötuba", link: "/day-2/practical-workshop" }
                ]
            }
        ],

        socialLinks: [
            // soovi korral lisa repo link hiljem:
            // { icon: "github", link: "https://github.com/..." }
        ],

        footer: {
            message: "Õppematerjal sisekasutuseks (kool).",
            copyright: "©"
        }
    }
};
