import { KlasaClient, KlasaUser, KlasaMessage } from 'klasa';
import { MessageAttachment } from 'discord.js';

import { randomItemFromArray } from '../util';
import getUsersPerkTier from './getUsersPerkTier';
import { Time, PerkTier, alphaNumericalChars } from '../constants';
import { channelIsSendable } from './channelIsSendable';

export async function handleTripFinish(
	client: KlasaClient,
	user: KlasaUser,
	channelID: string,
	message: string,
	onContinue?: (message: KlasaMessage) => Promise<KlasaMessage | KlasaMessage[] | null>,
	attachment?: Buffer
) {
	const channel = client.channels.get(channelID);
	if (!channelIsSendable(channel)) return;

	const perkTier = getUsersPerkTier(user);
	const continuationChar =
		perkTier > PerkTier.Two ? 'y' : randomItemFromArray(alphaNumericalChars);
	if (onContinue) {
		message += `\nSay \`${continuationChar}\` to repeat this trip.`;
	}

	client.queuePromise(() => {
		channel.send(message, attachment ? new MessageAttachment(attachment) : undefined);

		if (!onContinue) return;

		channel
			.awaitMessages(
				mes => mes.author === user && mes.content?.toLowerCase() === continuationChar,
				{
					time: perkTier > PerkTier.Two ? Time.Minute * 10 : Time.Minute * 2,
					max: 1
				}
			)
			.then(async messages => {
				const response = messages.first();
				if (response && !user.minionIsBusy) {
					try {
						await onContinue(response as KlasaMessage);
					} catch (err) {
						channel.send(err);
					}
				}
			});
	});
}
