const express = require("express");
const app = express();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const moment = require('moment');
require('dotenv').config();

// إعدادات الخادم
app.listen(() => console.log("Bot is running 24/7!"));
app.get('/', (req, res) => {
  res.send(`
  <body>
  <center><h1>The bot is running 24/7!</h1></center>
  </body>`);
});

// تحميل إعدادات البوت من config.json
const config = require('./config.json');
const rolesallowed = config.roles;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// تحميل قائمة الحظر من الملف
let blocklist = [];
try {
  const data = fs.readFileSync('blocklist.json', 'utf8');
  blocklist = JSON.parse(data);
} catch (err) {
  console.error('خطأ في قراءة ملف الحظر أو الملف غير موجود، يرجى إنشاؤه ب []', err);
}

// التعامل مع حدث 'ready'
client.on('ready', async () => {
  const commands = [
    {
      name: 'setup',
      description: 'إعداد التقديم',
    },
    {
      name: "block",
      description: "حظر المستخدم من استخدام الأوامر",
      options: [
        {
          name: "block",
          description: "يرجى ذكر المستخدم للحظر",
          required: true,
          type: ApplicationCommandOptionType.User,
        },
      ],
    },
    {
      name: "remove-block",
      description: "إزالة الحظر عن المستخدم",
      options: [
        {
          name: "remove-block",
          description: "يرجى ذكر المستخدم لإزالة الحظر",
          required: true,
          type: ApplicationCommandOptionType.User,
        },
      ],
    },
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Started refreshing (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID), { body: commands });

    console.log('Successfully reloaded (/) commands.');
  } catch (error) {
    console.error(error);
  }
  console.log(`Logged in as ${client.user.tag}!`);
});

// التعامل مع الأحداث 'interactionCreate'
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    // التعامل مع الأوامر
    if (interaction.commandName === 'block') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return interaction.reply({ content: "ليس لديك الصلاحيات أو الأدوار المطلوبة لاستخدام هذا الأمر.", ephemeral: true });
      }
      const member1 = interaction.options.getMember('block');

      if (!member1) {
        return interaction.reply('يرجى ذكر مستخدم للحظر.');
      }

      if (blocklist.includes(member1.id)) {
        return interaction.reply('هذا المستخدم محظور بالفعل!');
      }
      interaction.reply(`تم حظر المستخدم ${member1} بنجاح.`);

      blocklist.push(member1.id);

      fs.writeFileSync('blocklist.json', JSON.stringify(blocklist));
    }

    if (interaction.commandName === 'remove-block') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return interaction.reply({ content: "ليس لديك الصلاحيات أو الأدوار المطلوبة لاستخدام هذا الأمر.", ephemeral: true });
      }
      let userToRemove = interaction.options.getMember('remove-block');
      if (!userToRemove) return interaction.reply('يرجى ذكر مستخدم لإزالة الحظر.');
      const index = blocklist.indexOf(userToRemove.id);
      if (index !== -1) {
        try {
          await interaction.reply(`تمت إزالة الحظر عن المستخدم ${userToRemove}.`);
          blocklist.splice(index, 1);
          fs.writeFileSync('blocklist.json', JSON.stringify(blocklist));
        } catch (err) {
          console.error(err);
          return interaction.followUp(":x: حدث خطأ أثناء معالجة الطلب.");
        }
      } else {
        interaction.reply(`${userToRemove} غير محظور.`)
          .catch(err => console.error(err));
      }
    }

    if (interaction.commandName === 'setup') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return interaction.reply({ content: "ليس لديك الصلاحيات أو الأدوار المطلوبة لاستخدام هذا الأمر.", ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('طلب إجازة إدارية')
        .setDescription(' ```انقر هنا للتقديم على الإجازة``` ')
        .setImage(config.image)
        .setColor(config.embedcolor)
        .setFooter({ text: 'Mexico United Kingdom' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel(config.title)
            .setCustomId('apply')
        );
      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });
    }
  } else if (interaction.isButton()) {
    // التعامل مع الأزرار
    if (interaction.customId === 'apply') {
      if (blocklist.includes(interaction.user.id)) {
        await interaction.reply({ content: 'أنت محظور من التقديم ولا يمكنك إرسال طلب.', ephemeral: true });
        return;
      }
      const modal = new ModalBuilder()
        .setTitle('طلب إجازة')
        .setCustomId('staff_apply');
      
      // إعداد المكونات
      const nameComponent = new TextInputBuilder()
        .setCustomId('q1')
        .setLabel(`${config.q1}`)
        .setMinLength(2)
        .setMaxLength(25)
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
      
      const ageComponent = new TextInputBuilder()
        .setCustomId('q2')
        .setLabel(`${config.q2}`)
        .setMinLength(1)
        .setMaxLength(2)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const rows = [nameComponent, ageComponent].map(
        (component) => new ActionRowBuilder().addComponents(component)
      );

      modal.addComponents(...rows);
      
      // عرض المودال
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'staff_accept') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return;
      }
      const getIdFromFooter = interaction.message.embeds[0]?.footer?.text;
      if (!getIdFromFooter) return interaction.reply("لا يمكن العثور على المستخدم في الرسالة.");
      const getMember = await interaction.guild.members.fetch(getIdFromFooter);

      // تحديث قاعدة البيانات
      try {
        const data = fs.readFileSync('vacation.json', 'utf8');
        let vacationList = JSON.parse(data);
        const index = vacationList.findIndex(item => item.id === getMember.id);
        if (index !== -1) {
          vacationList[index].status = 'accepted';
          fs.writeFileSync('vacation.json', JSON.stringify(vacationList));
        }
      } catch (err) {
        console.error('خطأ في قراءة أو كتابة ملف الإجازات:', err);
      }

      try {
        await getMember.send('**تمت الموافقة على إجازتك، استمتع بإجازتك 🌹**');
      } catch (error) {
        console.error('فشل في إرسال رسالة إلى المستخدم:', error);
      }
      try {
        await getMember.roles.add(config.staffid);
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: ":x: حدث خطأ، غير قادر على تنفيذ العملية.",
        });
      }
      await interaction.reply({
        content: `تم قبول طلب الإجازة بنجاح ${getMember.user.tag}`
      });

      // تحديد المدة الزمنية بناءً على الإجابة في q2
      const q2 = parseInt(interaction.message.embeds[0]?.fields[1]?.value, 10);
      const durationMs = moment.duration(q2, 'days').asMilliseconds();

      // إعداد المؤقت لإزالة الرتبة بعد انتهاء الفترة
      setTimeout(async () => {
        try {
          await getMember.roles.remove(config.staffid);
          await getMember.send('**تمت نهاية فترة الإجازة الخاصة بك، نتمنى لك يوماً سعيداً!**');

          // حذف التقديم من قاعدة البيانات
          try {
            const data = fs.readFileSync('vacation.json', 'utf8');
            let vacationList = JSON.parse(data);
            vacationList = vacationList.filter(item => item.id !== getMember.id);
            fs.writeFileSync('vacation.json', JSON.stringify(vacationList));
          } catch (err) {
            console.error('خطأ في قراءة أو كتابة ملف الإجازات عند الحذف:', err);
          }

        } catch (error) {
          console.error('فشل في إزالة الرتبة أو إرسال الرسالة:', error);
        }
      }, durationMs);

      const newDisabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_accept_ended')
            .setDisabled()
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
            .setLabel('قبول')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_deny_ended')
            .setDisabled()
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
            .setLabel('رفض')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_block')
            .setEmoji("🚫")
            .setDisabled()
            .setStyle(ButtonStyle.Danger)
            .setLabel('حظر')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_time')
            .setStyle(ButtonStyle.Secondary)
            .setLabel('عرض الوقت المتبقي')
        );
      await interaction.message.edit({
        components: [newDisabledRow]
      });
    }

    if (interaction.customId === 'staff_deny') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return;
      }
      const getIdFromFooter = interaction.message.embeds[0]?.footer?.text;
      if (!getIdFromFooter) return interaction.reply("لا يمكن العثور على المستخدم في الرسالة.");
      const getMember = await interaction.guild.members.fetch(getIdFromFooter);
      
      // حذف التقديم من قاعدة البيانات
      try {
        const data = fs.readFileSync('vacation.json', 'utf8');
        let vacationList = JSON.parse(data);
        vacationList = vacationList.filter(item => item.id !== getMember.id);
        fs.writeFileSync('vacation.json', JSON.stringify(vacationList));
      } catch (err) {
        console.error('خطأ في قراءة أو كتابة ملف الإجازات عند الحذف:', err);
      }

      try {
        await getMember.send('**للأسف، تم رفض طلب إجازتك 😔**');
      } catch (error) {
        console.error('فشل في إرسال رسالة إلى المستخدم:', error);
      }
      await interaction.reply({
        content: `${config.nomessage} ${getMember.user.tag}`
      });
      const newDisabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_accept_ended')
            .setDisabled()
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
            .setLabel('قبول')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_deny_ended')
            .setDisabled()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("❌")
            .setLabel('رفض')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_block')
            .setDisabled()
            .setEmoji("🚫")
            .setStyle(ButtonStyle.Danger)
            .setLabel('حظر')
        );
      await interaction.message.edit({
        components: [newDisabledRow]
      });
    }

    if (interaction.customId === 'staff_block') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return;
      }
      const getIdFromFooter = interaction.message.embeds[0]?.footer?.text;
      if (!getIdFromFooter) return interaction.reply("لا يمكن العثور على المستخدم في الرسالة.");
      const getMember = await interaction.guild.members.fetch(getIdFromFooter);

      // حذف التقديم من قاعدة البيانات
      try {
        const data = fs.readFileSync('vacation.json', 'utf8');
        let vacationList = JSON.parse(data);
        vacationList = vacationList.filter(item => item.id !== getMember.id);
        fs.writeFileSync('vacation.json', JSON.stringify(vacationList));
      } catch (err) {
        console.error('خطأ في قراءة أو كتابة ملف الإجازات عند الحذف:', err);
      }

      try {
        await getMember.send('**للأسف، تم حظرك من التقديم**');
      } catch (error) {
        console.error('فشل في إرسال رسالة إلى المستخدم:', error);
      }
      await interaction.reply({
        content: `${config.nomessage} ${getMember.user.tag}`
      });
      const newDisabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_accept_ended')
            .setDisabled()
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅")
            .setLabel('قبول')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_deny_ended')
            .setDisabled()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("❌")
            .setLabel('رفض')
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_block')
            .setDisabled()
            .setEmoji("🚫")
            .setStyle(ButtonStyle.Danger)
            .setLabel('حظر')
        );
      await interaction.message.edit({
        components: [newDisabledRow]
      });
    }

    if (interaction.customId === 'staff_time') {
      if (
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !interaction.member.roles.cache.some(role => rolesallowed.includes(role.id))
      ) {
        return;
      }
      const getIdFromFooter = interaction.message.embeds[0]?.footer?.text;
      if (!getIdFromFooter) return interaction.reply("لا يمكن العثور على المستخدم في الرسالة.");
      const getMember = await interaction.guild.members.fetch(getIdFromFooter);

      // قراءة قائمة الإجازات
      try {
        const data = fs.readFileSync('vacation.json', 'utf8');
        const vacationList = JSON.parse(data);
        const vacation = vacationList.find(item => item.id === getMember.id);

        if (!vacation) {
          return interaction.reply({ content: 'لا توجد معلومات إجازة لهذا المستخدم.', ephemeral: true });
        }

        const durationMs = moment.duration(parseInt(vacation.q2, 10), 'days').asMilliseconds();
        const endTime = moment().add(durationMs, 'milliseconds');
        const remainingTime = moment.duration(endTime.diff(moment()));

        const hours = Math.floor(remainingTime.asHours());
        const minutes = Math.floor(remainingTime.minutes());
        const seconds = Math.floor(remainingTime.seconds());

        const timeRemainingMessage = `الوقت المتبقي للإجازة هو: ${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية.`;

        await interaction.reply({ content: timeRemainingMessage, ephemeral: true });
      } catch (err) {
        console.error('خطأ في قراءة ملف الإجازات:', err);
        await interaction.reply({ content: 'حدث خطأ أثناء محاولة قراءة معلومات الإجازة.', ephemeral: true });
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'staff_apply') {
      const q1 = interaction.fields.getTextInputValue('q1');
      const q2 = interaction.fields.getTextInputValue('q2');

      // تحقق من أن q2 يحتوي فقط على أرقام ويكون طوله 2
      if (!/^\d{1,2}$/.test(q2)) {
        await interaction.reply({
            content: 'يرجى ادخال ارقام فقط في المدة, متجننيش يسطا 😒',
            ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: 'تم إرسال طلبك بنجاح!',
        ephemeral: true
      });

      const staffSubmitChannel = interaction.guild.channels.cache.get(config.staffroom);
      if (!staffSubmitChannel) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setColor(config.embedcolor)
        .setFooter({ text: interaction.user.id })
        .setTimestamp()
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: `${config.q1}`, value: q1, inline: false },
          { name: `${config.q2}`, value: q2, inline: false }
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_accept')
            .setLabel('قبول')
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_deny')
            .setLabel('رفض')
            .setEmoji("❌")
            .setStyle(ButtonStyle.Secondary)
        )
        .addComponents(
          new ButtonBuilder()
            .setCustomId('staff_block')
            .setEmoji("🚫")
            .setStyle(ButtonStyle.Danger)
            .setLabel('حظر')
        );

      await staffSubmitChannel.send({
        embeds: [embed],
        components: [row]
      });

      // تخزين البيانات في vacation.json
      const vacationData = {
        id: interaction.user.id,
        q1: q1,
        q2: q2,
        status: 'pending'
      };

      try {
        let vacationList = [];
        try {
          const data = fs.readFileSync('vacation.json', 'utf8');
          vacationList = JSON.parse(data);
        } catch (err) {
          console.error('خطأ في قراءة ملف الإجازات أو الملف غير موجود، يتم إنشاء واحد جديد.', err);
        }

        vacationList.push(vacationData);
        fs.writeFileSync('vacation.json', JSON.stringify(vacationList));
      } catch (err) {
        console.error('خطأ في الكتابة إلى ملف الإجازات:', err);
      }
    }
  }
});

// تسجيل الدخول إلى Discord
client.login(process.env.TOKEN);

