# Logos guide

sysketch can draw the **official logo or icon** of a product (Amazon S3, Azure Cosmos DB, Stripe, PostgreSQL...) instead of its own icon. Logos are optional, and they don't change how you write diagrams: you still write `s3` or `stripe`.

![Event-driven app on Azure, drawn with the official Azure icons](logos/azure-events.svg)

<sub>Drawn with the official Azure icons, unmodified. Azure is a trademark of Microsoft; sysketch is not affiliated with or endorsed by Microsoft.</sub>

## Where logos come from

sysketch doesn't include any company logos. You install them on your own computer from the official source, and sysketch keeps them in a `.sysketch/logos` folder in your home directory, outside your projects. There are three sources.

### 1. Cloud icon packs (AWS, Azure, Google Cloud)

The cloud providers publish their own icons for architecture diagrams. Download the pack, then import the `.zip` as it is:

| Provider     | Download                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| AWS          | [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/): "Download the asset package"                 |
| Azure        | [Azure icons](https://learn.microsoft.com/en-us/azure/architecture/icons/): accept the terms, "Download SVG icons" |
| Google Cloud | [Google Cloud icons](https://cloud.google.com/icons): "Core products"                                              |

```bash
npx sysketch logos import ~/Downloads/<icon-pack>.zip
```

sysketch recognizes the provider and its file names. Everyday names then work: `s3`, `lambda`, `sqs`, `eks`, `route53` (AWS), `aks`, `cosmosdb`, `keyvault`, `servicebus` (Azure), `bigquery`, `cloudrun`, `gke`, `spanner` (Google Cloud). To update, import a newer pack the same way.

### 2. Product logos (Simple Icons)

[Simple Icons](https://simpleicons.org) collects about 3,400 single-color brand marks. One command downloads them from the official package and checks the download is genuine:

```bash
npx sysketch logos install simple-icons
```

Each mark is drawn in the brand's official color. Some companies (including AWS, Azure and OpenAI) asked Simple Icons not to include them; use their own icon packs instead.

### 3. Your company's logos

Keep your approved logo files (`.svg` or `.png`) in a folder next to your diagrams, and point the diagram at it:

```yaml
logos: ./brand
```

Files are matched by name: `brand/billing.svg` is used for `billing`. To make sure nobody edits a logo by accident, record a fingerprint of every file:

```bash
npx sysketch logos lock ./brand
```

## Which name shows what

| In your diagram                     | With logos installed      | Without logos                   |
| ----------------------------------- | ------------------------- | ------------------------------- |
| `database`, `queue`, `api`, `cdn`   | sysketch icon             | sysketch icon                   |
| `s3`, `redis`, `stripe`, `sendgrid` | the official logo         | a fitting sysketch icon         |
| `acme/queue`                        | Acme's logo, if installed | the `queue` icon labeled "Acme" |

Generic names always keep the sysketch icon. Because every product name has a fallback, the same diagram works on any computer.

## Logos stay original

- Files are stored exactly as published and fingerprinted when installed.
- Before drawing, sysketch checks the fingerprint again and refuses a logo that was changed.
- Logos are placed as-is on a neutral tile: never recolored, stretched or restyled by the theme.

## Using logos responsibly

Logos belong to their owners. Before publishing a diagram that shows them:

- Check the brand's rules. `npx sysketch logos info stripe` shows the license, brand guidelines and original artwork link when known.
- Don't use logos in a way that suggests a company endorses you.
- Don't commit downloaded icon packs to a public repository; each person installs their own.

The AWS and Azure icon packs are published specifically for architecture diagrams, which is why the examples in this repository use them.

## Commands

```bash
npx sysketch logos                         # list installed sources
npx sysketch logos find s3                 # search installed logos
npx sysketch logos info stripe             # license, guidelines and source of one logo
npx sysketch logos remove simple-icons     # remove a source
```

`npx sysketch render diagram.yaml --no-logos` draws without logos. In a diagram file, `logos: false` does the same.
