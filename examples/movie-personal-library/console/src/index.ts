import "cross-fetch/polyfill";
import kleur from "kleur";
import prompts from "prompts";
import createClient from "movie-personal-library-api-client";

const client = createClient({
    endpoint: process.env.API_ENDPOINT || "http://localhost:3000"
});


async function printWelcome() {
    const info = await client.info()
    console.log(kleur.bold(
        kleur.bgGreen(` ${info.name} `) +
        kleur.bgWhite(` v${info.version}`) +
        "\n"
    ));
}

async function printStats() {
    const stats = await client.stats();
    console.log(`${kleur.bold("Movies:")}\t\t${stats.count}`);
    console.log(`${kleur.bold("Genres:")}\t\t${stats.genres.length}`);
    console.log(`${kleur.bold("Actors:")}\t\t${stats.actorCount}`);
    console.log(`${kleur.bold("Directors:")}\t${stats.directorCount}`);
    console.log("\n");
}


async function viewMovieInfo() {
    let term: string;
    do {
        ({ term } = await prompts({
            name: "term",
            type: "text",
            message: "Search a movie by title (min 3 chars):"
        }));
    } while (!term || term.length <= 2);

    const results = await client.searchMovie({
        text: term
    });
    if (results.length === 0) {
        console.log("No movie found for: %s", term);
        return;
    }


    const { movieId } = await prompts({
        name: "movieId",
        type: "select",
        message: "Please select",
        choices: results.map(x => ({
            title: x.title,
            value: x.id
        }))
    });

    const movie = results.find(x => x.id === movieId)!;
    console.log(
        "\n" +
        kleur.bold(movie.title) + "\n" +
        movie.tagline + "\n\n" +
        kleur.gray("Genres: ") + movie.genres.join(", ") + "\n" +
        kleur.gray("Directors: ") + movie.directors.map(x => x.name).join(", ") + "\n" +
        kleur.gray("Cast: ") + movie.cast.map(x => x.name).join(", ") + "\n"
    );
}

async function viewMovieByPerson() {
    let term: string;
    do {
        ({ term } = await prompts({
            name: "term",
            type: "text",
            message: "Search for a person (min 3 chars):"
        }));
    } while (!term || term.length <= 2);

    const results = await client.searchPerson(term);
    if (results.length === 0) {
        console.log("No person found for: %s", term);
        return;
    }

    const { personId } = await prompts({
        name: "personId",
        type: "select",
        message: "Please select",
        choices: results.map(x => ({
            title: x.name,
            value: x.id
        }))
    });
    console.log("\n");

    const person = results.find(x => x.id === personId)!;

    const movies = await client.searchMovie({
        person: personId
    });
    if (movies.length === 0) {
        console.log("No movie found with: %s", person.name);
        return;
    }

    console.log(kleur.gray("Movies with: ") + kleur.bold(person.name) + "\n");
    movies.sort((x, y) => new Date(y.release_date).getTime() - new Date(x.release_date).getTime())
        .forEach(x => console.log(`(${x.release_date.substring(0, 4)}) ${x.title}`));

    console.log("\n");
}


async function main() {
    await printWelcome();

    do {
        const action = await prompts({
            name: "menu",
            type: "select",
            message: "What would you like to do?",
            choices: [
                { title: "View library stats", value: "stats" },
                { title: "View a movie info", value: "view" },
                { title: "View all movies of someone", value: "by-person" },
                { title: "Exit", value: "exit" },
            ]
        }, {
            onCancel: () => process.exit(0)
        });

        switch (action.menu) {
            case "stats": await printStats(); break;
            case "view": await viewMovieInfo(); break;
            case "by-person": await viewMovieByPerson(); break;
            case "exit": return;
        }
    } while (true);
}


main();
