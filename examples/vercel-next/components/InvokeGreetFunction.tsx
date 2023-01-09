import { useState } from 'react';
import styles from '../styles/Home.module.css'
import { inter } from '../styles/font';
import client from './client';


export function InvokeGreetFunction() {
  const [name, setName] = useState("");
  const [result, setResult] = useState("");

  const invokeGreet = async () => {
    const result = await client.greet(name);
    setResult(result);
  };


  return (
    <a
      className={styles.card}
      target="_blank"
      rel="noopener noreferrer"
    >
      <h2 className={inter.className}>
        Call <code>greet</code> function <span>-&gt;</span>
      </h2>
      <p className={inter.className}>
        Greeting message from the API
      </p>

      <div className={`${inter.className} ${styles.formInline}`}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={name} onChange={ev => setName(ev.target.value)} />
        </div>
      </div>

      <div className="action-container">
        <button onClick={invokeGreet}>Greet</button>
      </div>

      <div className={inter.className}>
        <label htmlFor="r">Result</label>
        <span className="result">{result}</span>
      </div>
    </a>
  );
}
