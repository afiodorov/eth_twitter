import { Reply } from './responses';
import { formatSingleLineText, formatDate, formatMultiLineText } from './formatters';
import { AppManager } from './app_manager';
import { ReplyEntity } from './entity_store';
import { likeReply } from './handlers/like';

function makeReplyContainer(
  r: Reply,
  shouldShowName: boolean,
  appManager: AppManager,
  isLast: boolean
): HTMLDivElement {
  const text = r.text;
  const formattedText = formatMultiLineText(text);
  const author = shouldShowName ? formatSingleLineText(r.displayName) : '';

  const leftQuoteElement = document.createElement('div');
  leftQuoteElement.classList.add('reply-left-quote');
  leftQuoteElement.innerText = '>';

  const textElement = document.createElement('div');
  textElement.classList.add('reply-text');
  textElement.innerHTML = formattedText;

  const textContainer = document.createElement('div');
  textContainer.classList.add('reply-text-container');
  textContainer.appendChild(leftQuoteElement);
  textContainer.appendChild(textElement);

  const restContainer = document.createElement('div');
  restContainer.classList.add('reply-rest-container');

  const replyContainer = document.createElement('div');
  replyContainer.classList.add('reply-container');

  if (shouldShowName) {
    const authorElement = document.createElement('div');
    authorElement.classList.add('reply-author');
    authorElement.textContent = `${author}`;

    const domainElement = document.createElement('div');
    domainElement.classList.add('reply-domain');
    domainElement.textContent = `@${r.sender}`;

    const authorContainer = document.createElement('div');
    authorContainer.classList.add('reply-author-container');
    authorContainer.appendChild(authorElement);
    authorContainer.appendChild(domainElement);

    appManager.ensLooker.reverseLookup(r.sender).then((result) => {
      if (result === null) {
        return;
      }
      domainElement.textContent = `@${result}`;
    });

    replyContainer.appendChild(authorContainer);
  }

  const dateElement = document.createElement('div');
  dateElement.classList.add('reply-date');
  dateElement.textContent = `📅${formatDate(r.blockTimestamp)}`;

  const likeElement = document.createElement('div');
  likeElement.classList.add('reply-like');
  if (appManager.metaMask == null) {
    likeElement.textContent = `❤`;
  } else {
    const likeElementLink = document.createElement('a');
    likeElementLink.href = '#';
    likeElementLink.textContent = `❤`;
    likeElementLink.classList.add('reply-like-link');
    likeElementLink.setAttribute('reply-id', r.id);
    likeElementLink.addEventListener('click', (event) =>
      likeReply(event, appManager.metaMask!, appManager.entityStore, appManager.queryDispatcher)
    );

    likeElement.appendChild(likeElementLink);
  }

  const likeElementText = document.createElement('div');
  if (r.numLikes > 0) {
    likeElementText.textContent = `${r.numLikes}`;
  }
  likeElementText.id = `reply-${r.id}-likes`;
  likeElement.appendChild(likeElementText);

  const quoteElement = document.createElement('div');
  quoteElement.classList.add('reply-quote');

  if (appManager.metaMask) {
    const quoteElementLink = document.createElement('a');
    quoteElementLink.href = '#';
    quoteElementLink.textContent = '🔄';
    quoteElementLink.setAttribute('reply-id', r.id);
    quoteElementLink.addEventListener('click', (event) =>
      appManager.interactionState.toggleDialogue(event, appManager.metaMask!, appManager)
    );

    quoteElement.appendChild(quoteElementLink);
  } else {
    const quoteElementNoLink = document.createElement('div');
    quoteElementNoLink.textContent = '🔄';

    quoteElement.appendChild(quoteElementNoLink);
  }

  const quoteElementText = document.createElement('div');
  quoteElementText.classList.add('reply-quote-text');
  quoteElementText.id = `reply-${r.id}-quotes`;
  if (r.numRetweets > 0) {
    quoteElementText.textContent = `${r.numRetweets}`;
  }

  quoteElement.appendChild(quoteElementText);

  const replyElement = document.createElement('div');
  replyElement.classList.add('thought-reply');
  if (isLast) {
    replyElement.textContent = `💬`;
  }

  restContainer.appendChild(replyElement);
  restContainer.appendChild(likeElement);
  restContainer.appendChild(quoteElement);
  restContainer.appendChild(dateElement);

  replyContainer.appendChild(textContainer);
  replyContainer.appendChild(restContainer);

  return replyContainer;
}

export async function fetchReplies(
  id: string,
  thoughtDisplayName: string,
  thoughtSender: string,
  appManager: AppManager
): Promise<Array<HTMLDivElement>> {
  const query = `{ newReplies(first: 30, orderBy: blockNumber, where:{tweet: "${id}"}) { id sender text displayName tweet blockTimestamp numLikes numRetweets seq_num } }`;
  const fetchedReplies = (await appManager.queryDispatcher.fetch(query))['newReplies'] as Reply[];
  fetchedReplies.forEach((r) => appManager.entityStore.replies.set(r.id, new ReplyEntity(r)));

  const replies = processReplies(fetchedReplies, thoughtDisplayName, thoughtSender);
  return replies.map((reply, i, replies) => {
    return makeReplyContainer(reply[0], reply[1], appManager, replies.length - 1 === i);
  });
}

export function processReplies(
  replies: Array<Reply>,
  thoughtDisplayName: string,
  thoughtSender: string
): [Reply, boolean][] {
  const res: Array<[Reply, boolean]> = new Array();

  let lastDisplayName = thoughtDisplayName;
  let lastSender = thoughtSender;

  replies.forEach((reply) => {
    if (reply.sender === lastSender && reply.displayName == lastDisplayName) {
      res.push([reply, false]);

      return;
    }

    res.push([reply, true]);
  });

  return res;
}
