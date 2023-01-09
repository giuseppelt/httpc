import fs from "fs/promises";
import { BadRequestError, httpCall } from "@httpc/server";
import db, { Person } from "../db";


const info = httpCall(async () => {
    const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));

    return {
        name: "Movie Library",
        version: packageJson.version as string
    }
});

const stats = httpCall(async () => {
    const movies = await db.load();
    const genres = [...new Set(movies.flatMap(x => x.genres))];
    const actors = [...new Set(movies.flatMap(x => x.cast.map(x => x.id)))];
    const directors = [...new Set(movies.flatMap(x => x.directors.map(x => x.id)))];

    return {
        count: movies.length,
        genres,
        actorCount: actors.length,
        directorCount: directors.length,
    };
});


type SearchMovieOptions = {
    text?: string
    person?: number
}

const searchMovie = httpCall(async ({ text, person }: SearchMovieOptions = {}) => {
    // validation
    if (text !== undefined && (typeof text !== "string" || text.length < 3)) {
        throw new BadRequestError();
    }
    if (person !== undefined && typeof person !== "number") {
        throw new BadRequestError();
    }


    text = text && text.toLowerCase();

    const movies = await db.load();

    const filtered = movies.filter(x => {
        if (text && x.title.toLowerCase().includes(text)) {
            return true;
        }
        if (person && (
            x.cast.some(x => x.id === person) ||
            x.directors.some(x => x.id === person)
        )) {
            return true;
        }

        return false;
    });

    return filtered.slice(0, 10);
})


const searchPerson = httpCall(async (text: string) => {
    // validation
    if (typeof text !== "string" || text.length < 3) {
        throw new BadRequestError();
    }

    // use lowercase to search    
    text = text.toLowerCase();

    const movies = await db.load();

    const persons = movies.reduce((persons, movie) => {
        movie.cast.forEach(x => {
            if (x.name.toLowerCase().includes(text)) {
                persons.set(x.id, x);
            }
        });

        movie.directors.forEach(x => {
            if (x.name.toLowerCase().includes(text)) {
                persons.set(x.id, x);
            }
        });

        return persons;
    }, new Map<number, Person>())

    return [...persons.values()].slice(0, 10);
});

export default {
    info,
    stats,
    searchMovie,
    searchPerson,
}
