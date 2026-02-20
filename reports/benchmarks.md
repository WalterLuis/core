# Benchmark Report

> Generated on 2026-02-20 at 11:58:41 UTC
>
> System: linux | AMD EPYC 7763 64-Core Processor (4 cores) | 16GB RAM | Bun 1.3.9

---

## Contents

- [Comparison](#comparison)
- [Copying](#copying)
- [Drawing](#drawing)
- [Forms](#forms)
- [Loading](#loading)
- [Saving](#saving)
- [Splitting](#splitting)

## Comparison

### Load PDF

| Benchmark | ops/sec |    Mean |     p99 |    RME | Samples |
| :-------- | ------: | ------: | ------: | -----: | ------: |
| libpdf    |   397.0 |  2.52ms |  4.42ms | ±2.67% |     199 |
| pdf-lib   |    24.8 | 40.25ms | 45.41ms | ±4.46% |      13 |

- **libpdf** is 15.98x faster than pdf-lib

### Create blank PDF

| Benchmark | ops/sec |  Mean |    p99 |    RME | Samples |
| :-------- | ------: | ----: | -----: | -----: | ------: |
| libpdf    |   17.3K |  58us |  122us | ±1.96% |   8,634 |
| pdf-lib   |    2.4K | 421us | 1.55ms | ±2.38% |   1,187 |

- **libpdf** is 7.28x faster than pdf-lib

### Add 10 pages

| Benchmark | ops/sec |  Mean |    p99 |    RME | Samples |
| :-------- | ------: | ----: | -----: | -----: | ------: |
| libpdf    |    9.9K | 101us |  163us | ±1.49% |   4,972 |
| pdf-lib   |    2.0K | 513us | 1.85ms | ±2.61% |     976 |

- **libpdf** is 5.10x faster than pdf-lib

### Draw 50 rectangles

| Benchmark | ops/sec |   Mean |    p99 |    RME | Samples |
| :-------- | ------: | -----: | -----: | -----: | ------: |
| libpdf    |    3.1K |  324us |  806us | ±1.47% |   1,546 |
| pdf-lib   |   615.2 | 1.63ms | 6.37ms | ±6.66% |     309 |

- **libpdf** is 5.02x faster than pdf-lib

### Load and save PDF

| Benchmark | ops/sec |    Mean |      p99 |    RME | Samples |
| :-------- | ------: | ------: | -------: | -----: | ------: |
| libpdf    |   423.3 |  2.36ms |   3.29ms | ±1.68% |     212 |
| pdf-lib   |    11.4 | 87.52ms | 101.30ms | ±5.12% |      10 |

- **libpdf** is 37.05x faster than pdf-lib

### Load, modify, and save PDF

| Benchmark | ops/sec |    Mean |     p99 |    RME | Samples |
| :-------- | ------: | ------: | ------: | -----: | ------: |
| libpdf    |    18.1 | 55.34ms | 61.85ms | ±5.52% |      10 |
| pdf-lib   |    11.5 | 86.86ms | 94.71ms | ±3.44% |      10 |

- **libpdf** is 1.57x faster than pdf-lib

### Extract single page from 100-page PDF

| Benchmark | ops/sec |   Mean |     p99 |    RME | Samples |
| :-------- | ------: | -----: | ------: | -----: | ------: |
| libpdf    |   268.6 | 3.72ms |  4.32ms | ±0.83% |     135 |
| pdf-lib   |   110.2 | 9.07ms | 10.55ms | ±1.51% |      56 |

- **libpdf** is 2.44x faster than pdf-lib

### Split 100-page PDF into single-page PDFs

| Benchmark | ops/sec |    Mean |      p99 |    RME | Samples |
| :-------- | ------: | ------: | -------: | -----: | ------: |
| libpdf    |    28.8 | 34.74ms |  44.58ms | ±4.67% |      15 |
| pdf-lib   |    10.7 | 93.27ms | 103.94ms | ±7.83% |       6 |

- **libpdf** is 2.68x faster than pdf-lib

### Split 2000-page PDF into single-page PDFs (0.9MB)

| Benchmark | ops/sec |     Mean |      p99 |    RME | Samples |
| :-------- | ------: | -------: | -------: | -----: | ------: |
| libpdf    |     1.6 | 637.06ms | 637.06ms | ±0.00% |       1 |
| pdf-lib   |   0.605 |    1.65s |    1.65s | ±0.00% |       1 |

- **libpdf** is 2.59x faster than pdf-lib

### Copy 10 pages between documents

| Benchmark | ops/sec |    Mean |     p99 |    RME | Samples |
| :-------- | ------: | ------: | ------: | -----: | ------: |
| libpdf    |   211.0 |  4.74ms |  5.69ms | ±1.37% |     106 |
| pdf-lib   |    82.9 | 12.06ms | 13.64ms | ±1.77% |      42 |

- **libpdf** is 2.55x faster than pdf-lib

### Merge 2 x 100-page PDFs

| Benchmark | ops/sec |    Mean |     p99 |    RME | Samples |
| :-------- | ------: | ------: | ------: | -----: | ------: |
| libpdf    |    65.1 | 15.35ms | 18.99ms | ±2.35% |      33 |
| pdf-lib   |    18.7 | 53.52ms | 54.58ms | ±1.01% |      10 |

- **libpdf** is 3.49x faster than pdf-lib

## Copying

### Copy pages between documents

| Benchmark                       | ops/sec |   Mean |    p99 |    RME | Samples |
| :------------------------------ | ------: | -----: | -----: | -----: | ------: |
| copy 1 page                     |   968.3 | 1.03ms | 2.33ms | ±2.96% |     485 |
| copy 10 pages from 100-page PDF |   211.2 | 4.73ms | 7.33ms | ±2.37% |     106 |
| copy all 100 pages              |   130.7 | 7.65ms | 8.71ms | ±0.98% |      66 |

- **copy 1 page** is 4.58x faster than copy 10 pages from 100-page PDF
- **copy 1 page** is 7.41x faster than copy all 100 pages

### Duplicate pages within same document

| Benchmark                                 | ops/sec |  Mean |    p99 |    RME | Samples |
| :---------------------------------------- | ------: | ----: | -----: | -----: | ------: |
| duplicate page 0                          |    1.0K | 961us | 1.56ms | ±1.06% |     521 |
| duplicate all pages (double the document) |    1.0K | 995us | 1.80ms | ±1.79% |     503 |

- **duplicate page 0** is 1.04x faster than duplicate all pages (double the document)

### Merge PDFs

| Benchmark               | ops/sec |    Mean |     p99 |    RME | Samples |
| :---------------------- | ------: | ------: | ------: | -----: | ------: |
| merge 2 small PDFs      |   671.3 |  1.49ms |  1.98ms | ±0.80% |     336 |
| merge 10 small PDFs     |   126.7 |  7.89ms |  8.41ms | ±0.80% |      64 |
| merge 2 x 100-page PDFs |    69.7 | 14.35ms | 17.12ms | ±1.33% |      35 |

- **merge 2 small PDFs** is 5.30x faster than merge 10 small PDFs
- **merge 2 small PDFs** is 9.63x faster than merge 2 x 100-page PDFs

## Drawing

| Benchmark                           | ops/sec |   Mean |    p99 |    RME | Samples |
| :---------------------------------- | ------: | -----: | -----: | -----: | ------: |
| draw 100 lines                      |    2.0K |  502us | 1.15ms | ±1.48% |     997 |
| draw 100 rectangles                 |    1.7K |  595us | 1.44ms | ±3.61% |     841 |
| draw 100 circles                    |   745.8 | 1.34ms | 3.28ms | ±3.11% |     373 |
| create 10 pages with mixed content  |   730.1 | 1.37ms | 2.47ms | ±1.77% |     366 |
| draw 100 text lines (standard font) |   579.4 | 1.73ms | 3.41ms | ±2.50% |     290 |

- **draw 100 lines** is 1.19x faster than draw 100 rectangles
- **draw 100 lines** is 2.67x faster than draw 100 circles
- **draw 100 lines** is 2.73x faster than create 10 pages with mixed content
- **draw 100 lines** is 3.44x faster than draw 100 text lines (standard font)

## Forms

| Benchmark         | ops/sec |    Mean |     p99 |    RME | Samples |
| :---------------- | ------: | ------: | ------: | -----: | ------: |
| read field values |   316.9 |  3.16ms |  6.15ms | ±1.89% |     159 |
| get form fields   |   281.2 |  3.56ms |  6.15ms | ±3.29% |     141 |
| flatten form      |   113.8 |  8.79ms | 11.74ms | ±2.44% |      57 |
| fill text fields  |    85.4 | 11.70ms | 14.75ms | ±3.64% |      43 |

- **read field values** is 1.13x faster than get form fields
- **read field values** is 2.78x faster than flatten form
- **read field values** is 3.71x faster than fill text fields

## Loading

| Benchmark              | ops/sec |   Mean |    p99 |    RME | Samples |
| :--------------------- | ------: | -----: | -----: | -----: | ------: |
| load small PDF (888B)  |   15.4K |   65us |  159us | ±0.85% |   7,722 |
| load medium PDF (19KB) |   10.1K |   99us |  192us | ±0.63% |   5,066 |
| load form PDF (116KB)  |   716.9 | 1.39ms | 2.62ms | ±1.68% |     359 |
| load heavy PDF (9.9MB) |   434.2 | 2.30ms | 2.78ms | ±0.68% |     218 |

- **load small PDF (888B)** is 1.52x faster than load medium PDF (19KB)
- **load small PDF (888B)** is 21.54x faster than load form PDF (116KB)
- **load small PDF (888B)** is 35.57x faster than load heavy PDF (9.9MB)

## Saving

| Benchmark                          | ops/sec |   Mean |    p99 |    RME | Samples |
| :--------------------------------- | ------: | -----: | -----: | -----: | ------: |
| save unmodified (19KB)             |    8.9K |  113us |  256us | ±1.00% |   4,438 |
| incremental save (19KB)            |    5.4K |  185us |  385us | ±1.16% |   2,710 |
| save with modifications (19KB)     |    1.3K |  795us | 1.52ms | ±1.64% |     629 |
| save heavy PDF (9.9MB)             |   426.5 | 2.34ms | 2.84ms | ±0.67% |     214 |
| incremental save heavy PDF (9.9MB) |   160.5 | 6.23ms | 7.66ms | ±1.29% |      81 |

- **save unmodified (19KB)** is 1.64x faster than incremental save (19KB)
- **save unmodified (19KB)** is 7.06x faster than save with modifications (19KB)
- **save unmodified (19KB)** is 20.81x faster than save heavy PDF (9.9MB)
- **save unmodified (19KB)** is 55.28x faster than incremental save heavy PDF (9.9MB)

## Splitting

### Extract single page

| Benchmark                                | ops/sec |    Mean |     p99 |    RME | Samples |
| :--------------------------------------- | ------: | ------: | ------: | -----: | ------: |
| extractPages (1 page from small PDF)     |   968.9 |  1.03ms |  2.45ms | ±2.86% |     485 |
| extractPages (1 page from 100-page PDF)  |   268.2 |  3.73ms |  4.41ms | ±1.51% |     135 |
| extractPages (1 page from 2000-page PDF) |    16.5 | 60.52ms | 61.56ms | ±0.85% |      10 |

- **extractPages (1 page from small PDF)** is 3.61x faster than extractPages (1 page from 100-page PDF)
- **extractPages (1 page from small PDF)** is 58.64x faster than extractPages (1 page from 2000-page PDF)

### Split into single-page PDFs

| Benchmark                   | ops/sec |     Mean |      p99 |    RME | Samples |
| :-------------------------- | ------: | -------: | -------: | -----: | ------: |
| split 100-page PDF (0.1MB)  |    30.6 |  32.68ms |  36.96ms | ±3.17% |      16 |
| split 2000-page PDF (0.9MB) |     1.7 | 600.80ms | 600.80ms | ±0.00% |       1 |

- **split 100-page PDF (0.1MB)** is 18.38x faster than split 2000-page PDF (0.9MB)

### Batch page extraction

| Benchmark                                              | ops/sec |    Mean |     p99 |    RME | Samples |
| :----------------------------------------------------- | ------: | ------: | ------: | -----: | ------: |
| extract first 10 pages from 2000-page PDF              |    16.1 | 61.99ms | 67.02ms | ±2.58% |       9 |
| extract first 100 pages from 2000-page PDF             |    15.5 | 64.58ms | 66.63ms | ±1.37% |       8 |
| extract every 10th page from 2000-page PDF (200 pages) |    14.2 | 70.54ms | 84.28ms | ±7.17% |       8 |

- **extract first 10 pages from 2000-page PDF** is 1.04x faster than extract first 100 pages from 2000-page PDF
- **extract first 10 pages from 2000-page PDF** is 1.14x faster than extract every 10th page from 2000-page PDF (200 pages)

---

_Results are machine-dependent. Use for relative comparison only._
