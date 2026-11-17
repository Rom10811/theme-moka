// The desktop refuses a backdrop past about 120,000 characters, under the
// 131,072 the API documents. Rounding every coordinate of two digits or more
// to a whole unit (a twentieth of a pixel at most) and dropping a leading
// zero brings the board under it with nothing visible lost.
export const compact = (svg: string) =>
  svg
    .replace(/(?<![\d.])(\d{2,}\.\d+)/g, n => String(Math.round(Number(n))))
    .replace(/(?<![\d.\w])0\.(\d)/g, '.$1')
