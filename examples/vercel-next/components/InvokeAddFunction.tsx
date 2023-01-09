import { useState } from 'react';
import styles from '../styles/Home.module.css'
import { inter } from '../styles/font';
import client from './client';


export function InvokeAddFunction() {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const [result, setResult] = useState<number>();

  const invokeAdd = async () => {
    const result = await client.add(x, y);
    setResult(result);
  };


  return (
    <a
      className={styles.card}
      target="_blank"
      rel="noopener noreferrer"
    >
      <h2 className={inter.className}>
        Call <code>add</code> function <span>-&gt;</span>
      </h2>
      <p className={inter.className}>
        Sample addition made via API
      </p>

      <div className={`${inter.className} ${styles.formInline}`}>
        <div>
          <label htmlFor="x">X</label>
          <input id="x" type="number" value={x} onChange={ev => setX(Number(ev.target.value))} />
        </div>
        <span className={styles.symbol}>+</span>
        <div>
          <label htmlFor="y">Y</label>
          <input id="y" type="number" value={y} onChange={ev => setY(Number(ev.target.value))} />
        </div>
      </div>

      <div className="action-container">
        <button onClick={invokeAdd}>Add</button>
      </div>

      <div className={inter.className}>
        <label htmlFor="r">Result</label>
        <span className="result" style={{ textAlign: "right" }}>{result}</span>
      </div>
    </a>
  );
}
