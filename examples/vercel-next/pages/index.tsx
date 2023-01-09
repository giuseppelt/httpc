import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { InvokeAddFunction } from '../components/InvokeAddFunction';
import { InvokeGreetFunction } from '../components/InvokeGreetFunction';

export default function Home() {
  return (
    <>
      <Head>
        <title>HTTPC with Vercel/Next</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <div className={styles.description}>
          <p>
            Edit your API functions at <code className={styles.code}>pages/api/_calls.ts</code>
          </p>
          <div>
            <a
              href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <b>API</b> with
              <Image
                src="/httpc-brand.svg"
                alt="httpc Logo"
                className={styles.vercelLogo}
                width={80}
                height={32}
                priority
              />
            </a>
          </div>
        </div>

        <div className={styles.center}>
          <Image
            className={styles.logo}
            src="/next.svg"
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
          />
          <div className={styles.thirteen}>
            <Image
              src="/thirteen.svg"
              alt="13"
              width={40}
              height={31}
              priority
            />
          </div>
        </div>

        <div className={styles.grid}>
          <InvokeAddFunction />
          <InvokeGreetFunction />
        </div>
      </main>
    </>
  )
}
