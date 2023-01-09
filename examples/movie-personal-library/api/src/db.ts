import fs from "fs/promises";


export type Movie = Readonly<{
    id: number
    original_language: string
    overview: string
    release_date: string
    runtime: number
    tagline: string
    title: string
    genres: readonly string[]
    directors: readonly Person[]
    cast: readonly Person[]
}>

export type Person = Readonly<{
    id: number
    name: string
}>



const DATABASE_FILE = "data/movie-db.json";

let movies: Movie[] = [];

async function load(): Promise<readonly Movie[]> {
    movies = JSON.parse(await fs.readFile(DATABASE_FILE, "utf8"));
    return movies;
}

async function save() {
    await fs.writeFile(DATABASE_FILE, JSON.stringify(movies), "utf8");
}


export default {
    load,
    save,
}
