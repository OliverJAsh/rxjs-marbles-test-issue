import { pipeWith } from "pipe-ts";
import { ConnectableObservable, interval, Observable } from "rxjs";
import { marbles } from "rxjs-marbles";
import {
  first,
  mergeMapTo,
  publishReplay,
  startWith,
  tap,
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

  const latestData$ = data$.pipe(
    first(),
    tap({
      next: (x) => console.log("next", x),
      complete: () => console.log("complete"),
    })
  );

  return { latestData$, connect: () => data$.connect() };
};

const test = marbles((m) => {
  const source$ = m.cold("     --(a|)   ");
  const ms = m.time("          -------|");
  const expected = "           --(a|)   ";
  const testDuration = m.time("--|");
  // const testDuration = ms;

  const cron = createDataCron(ms)(source$);

  const actual$ = cron.latestData$;

  m.expect(actual$).toBeObservable(expected);

  const subscription = cron.connect();

  m.scheduler.schedule(() => subscription.unsubscribe(), testDuration);
});

test();
