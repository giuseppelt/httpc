declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	interface Render {
		'.md': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	export { z } from 'astro/zod';
	export type CollectionEntry<C extends keyof typeof entryMap> =
		(typeof entryMap)[C][keyof (typeof entryMap)[C]];

	// TODO: Remove this when having this fallback is no longer relevant. 2.3? 3.0? - erika, 2023-04-04
	/**
	 * @deprecated
	 * `astro:content` no longer provide `image()`.
	 *
	 * Please use it through `schema`, like such:
	 * ```ts
	 * import { defineCollection, z } from "astro:content";
	 *
	 * defineCollection({
	 *   schema: ({ image }) =>
	 *     z.object({
	 *       image: image(),
	 *     }),
	 * });
	 * ```
	 */
	export const image: never;

	// This needs to be in sync with ImageMetadata
	export type ImageFunction = () => import('astro/zod').ZodObject<{
		src: import('astro/zod').ZodString;
		width: import('astro/zod').ZodNumber;
		height: import('astro/zod').ZodNumber;
		format: import('astro/zod').ZodUnion<
			[
				import('astro/zod').ZodLiteral<'png'>,
				import('astro/zod').ZodLiteral<'jpg'>,
				import('astro/zod').ZodLiteral<'jpeg'>,
				import('astro/zod').ZodLiteral<'tiff'>,
				import('astro/zod').ZodLiteral<'webp'>,
				import('astro/zod').ZodLiteral<'gif'>,
				import('astro/zod').ZodLiteral<'svg'>
			]
		>;
	}>;

	type BaseSchemaWithoutEffects =
		| import('astro/zod').AnyZodObject
		| import('astro/zod').ZodUnion<import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodDiscriminatedUnion<string, import('astro/zod').AnyZodObject[]>
		| import('astro/zod').ZodIntersection<
				import('astro/zod').AnyZodObject,
				import('astro/zod').AnyZodObject
		  >;

	type BaseSchema =
		| BaseSchemaWithoutEffects
		| import('astro/zod').ZodEffects<BaseSchemaWithoutEffects>;

	export type SchemaContext = { image: ImageFunction };

	type BaseCollectionConfig<S extends BaseSchema> = {
		schema?: S | ((context: SchemaContext) => S);
	};
	export function defineCollection<S extends BaseSchema>(
		input: BaseCollectionConfig<S>
	): BaseCollectionConfig<S>;

	type EntryMapKeys = keyof typeof entryMap;
	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidEntrySlug<C extends EntryMapKeys> = AllValuesOf<(typeof entryMap)[C]>['slug'];

	export function getEntryBySlug<
		C extends keyof typeof entryMap,
		E extends ValidEntrySlug<C> | (string & {})
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E
	): E extends ValidEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getCollection<C extends keyof typeof entryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E
	): Promise<E[]>;
	export function getCollection<C extends keyof typeof entryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown
	): Promise<CollectionEntry<C>[]>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof typeof entryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	const entryMap: {
		"blog": {
"function-nullable-on-demand-with-typescript-overloads.mdx": {
  id: "function-nullable-on-demand-with-typescript-overloads.mdx",
  slug: "function-nullable-on-demand-with-typescript-overloads",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
} & { render(): Render[".mdx"] },
"release-v0.1.0-announcement.mdx": {
  id: "release-v0.1.0-announcement.mdx",
  slug: "release-v010-announcement",
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
} & { render(): Render[".mdx"] },
},
"docs": {
"adapters/index.mdx": {
  id: "adapters/index.mdx",
  slug: "adapters",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"adapters/netlify.mdx": {
  id: "adapters/netlify.mdx",
  slug: "adapters/netlify",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"adapters/next.mdx": {
  id: "adapters/next.mdx",
  slug: "adapters/next",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"adapters/vercel.mdx": {
  id: "adapters/vercel.mdx",
  slug: "adapters/vercel",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"client-generation.mdx": {
  id: "client-generation.mdx",
  slug: "client-generation",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"client-publishing.mdx": {
  id: "client-publishing.mdx",
  slug: "client-publishing",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"client-usage.mdx": {
  id: "client-usage.mdx",
  slug: "client-usage",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"getting-started.mdx": {
  id: "getting-started.mdx",
  slug: "getting-started",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"httpc-call-convention.mdx": {
  id: "httpc-call-convention.mdx",
  slug: "httpc-call-convention",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"httpc-family.mdx": {
  id: "httpc-family.mdx",
  slug: "httpc-family",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"introduction.mdx": {
  id: "introduction.mdx",
  slug: "introduction",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-authentication.mdx": {
  id: "kit-authentication.mdx",
  slug: "kit-authentication",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-authorization.mdx": {
  id: "kit-authorization.mdx",
  slug: "kit-authorization",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-caching.mdx": {
  id: "kit-caching.mdx",
  slug: "kit-caching",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-dependency-injection.mdx": {
  id: "kit-dependency-injection.mdx",
  slug: "kit-dependency-injection",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-extending.mdx": {
  id: "kit-extending.mdx",
  slug: "kit-extending",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-introduction.mdx": {
  id: "kit-introduction.mdx",
  slug: "kit-introduction",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-logging.mdx": {
  id: "kit-logging.mdx",
  slug: "kit-logging",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"kit-validation.mdx": {
  id: "kit-validation.mdx",
  slug: "kit-validation",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"package-httpc-cli.mdx": {
  id: "package-httpc-cli.mdx",
  slug: "package-httpc-cli",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"package-httpc-client.mdx": {
  id: "package-httpc-client.mdx",
  slug: "package-httpc-client",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"package-httpc-kit.mdx": {
  id: "package-httpc-kit.mdx",
  slug: "package-httpc-kit",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"package-httpc-server.mdx": {
  id: "package-httpc-server.mdx",
  slug: "package-httpc-server",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"server-architecture.mdx": {
  id: "server-architecture.mdx",
  slug: "server-architecture",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"server-extending.mdx": {
  id: "server-extending.mdx",
  slug: "server-extending",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"server-request-context.mdx": {
  id: "server-request-context.mdx",
  slug: "server-request-context",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"server-testing.mdx": {
  id: "server-testing.mdx",
  slug: "server-testing",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"tutorials/guide-project-organization.mdx": {
  id: "tutorials/guide-project-organization.mdx",
  slug: "tutorials/guide-project-organization",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"tutorials/index.mdx": {
  id: "tutorials/index.mdx",
  slug: "tutorials",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
"tutorials/tutorial-movie-library.mdx": {
  id: "tutorials/tutorial-movie-library.mdx",
  slug: "tutorials/tutorial-movie-library",
  body: string,
  collection: "docs",
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] },
},

	};

	type ContentConfig = typeof import("../src/content/config");
}
