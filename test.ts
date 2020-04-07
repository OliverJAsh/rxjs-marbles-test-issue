import { pipeWith } from "pipe-ts";
import { ConnectableObservable, defer, interval, Observable } from "rxjs";
import { marbles } from "rxjs-marbles";
import {
  first,
  mapTo,
  mergeMapTo,
  publishReplay,
  startWith,
} from "rxjs/operators";

/** Fetch data every x ms. Return an observable that emits the most recent data. */
const createDataCron = <T>(customInterval: number) => (
  fetchData$: Observable<T>
) => {
  const requestData$ = interval(customInterval).pipe(startWith(0));

  const data$ = pipeWith(
    requestData$,
    mergeMapTo(fetchData$),
    publishReplay(1)
  ) as ConnectableObservable<T>;

  const latestData$ = data$.pipe(first());

  return { latestData$, connect: () => data$.connect() };
};

const test = marbles((m) => {
  const fetchDataTimer$ = m.cold("----(x|)");
  /** Increments a number with each subscription. Note: we can't use marble
   * diagrams to represent this (a cold observable that emits different values
   * each time it's called). */
  const fetchData$ = (() => {
    let i = 0;
    return defer(() => {
      const result$ = fetchDataTimer$.pipe(mapTo(i));
      i++;
      return result$;
    });
  })();

  const values = { a: 0, b: 1 };

  const intervalMs = m.time("     -------------|");

  // loading 0, waits then returns with 0

  const requestA = m.time("      --|");
  const expectedA = "            ----(a|)";

  // has data 0, returns immediately with 0

  const requestB = m.time("      ----------|");
  const expectedB = "            ----------(a|)";

  // loading 1, returns immediately with 0

  const requestC = m.time("      ----------------|");
  const expectedC = "            ----------------(a|)";

  // has data 1, returns immediately with 1

  const requestD = m.time("      ---------------------|");
  const expectedD = "            ---------------------(b|)";

  const testDuration = requestD;

  const cron = createDataCron(intervalMs)(fetchData$);

  const actual$ = cron.latestData$;

  m.scheduler.schedule(() => {
    m.expect(actual$).toBeObservable(expectedA, values);
  }, requestA);

  m.scheduler.schedule(() => {
    m.expect(actual$).toBeObservable(expectedB, values);
  }, requestB);

  m.scheduler.schedule(() => {
    m.expect(actual$).toBeObservable(expectedC, values);
  }, requestC);

  m.scheduler.schedule(() => {
    m.expect(actual$).toBeObservable(expectedD, values);
  }, requestD);

  const subscription = cron.connect();

  m.scheduler.schedule(() => subscription.unsubscribe(), testDuration);
});

test();
