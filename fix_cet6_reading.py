#!/usr/bin/env python3
"""补全CET6诊断题库的阅读passages"""
import json

reading_passages = [
    {
        "passage_id": 1,
        "title": "The Future of Remote Work",
        "text": """The COVID-19 pandemic has fundamentally altered the landscape of work, accelerating a shift toward remote employment that many analysts believe will persist long after the health crisis subsides. Before 2020, only about 5 percent of the U.S. workforce regularly worked from home. By mid-2021, that figure had surged to over 35 percent, and while some return-to-office mandates have been implemented, a significant proportion of workers continue to operate remotely at least part of the time.

Research from Stanford University indicates that remote workers are, on average, 13 percent more productive than their office-based counterparts. This finding challenges the conventional wisdom that physical presence equates to professional engagement. However, the same research highlights notable drawbacks: remote employees report higher levels of isolation, difficulty in separating work from personal life, and fewer opportunities for spontaneous collaboration—the so-called "water cooler moments" that often spark innovation.

Companies face their own set of challenges. Maintaining corporate culture, onboarding new employees, and ensuring cybersecurity are all more difficult in a distributed environment. Some organizations have adopted hybrid models, requiring employees to be present in the office two or three days per week, as a compromise. Yet this approach has its critics, who argue that it merely creates the worst of both worlds—the rigidity of office mandates without the full benefits of either arrangement.

The implications extend beyond individual companies. Commercial real estate markets have softened considerably, while residential markets in suburban and rural areas have boomed. Urban centers, long dependent on the daily influx of office workers, have seen declines in foot traffic and revenue for local businesses. Transportation patterns have shifted as well, with public transit systems struggling to maintain ridership levels sufficient to justify their operating costs.

Perhaps the most profound long-term effect concerns global labor markets. Remote work has effectively dissolved geographical boundaries for many knowledge-based positions, enabling companies to hire talent from anywhere in the world. This globalization of the workforce presents both opportunities and threats: while employees in developing nations gain access to higher-paying jobs, workers in developed countries face increased competition that may depress wages in certain sectors.""",
        "questions": [
            {"id": "CET6-RC-P1-01", "ability": "细节定位", "question": "What percentage of U.S. workers regularly worked from home before 2020?", "optionA": "About 5 percent", "optionB": "About 13 percent", "optionC": "About 35 percent", "optionD": "About 20 percent", "answer": "A", "explanation": "文中明确指出2020年前约5%的美国劳动力定期在家工作。"},
            {"id": "CET6-RC-P1-02", "ability": "推理判断", "question": "What can be inferred about the 'water cooler moments' mentioned in the passage?", "optionA": "They are formal meetings scheduled by management.", "optionB": "They contribute to innovation through casual interaction.", "optionC": "They have increased since the shift to remote work.", "optionD": "They are the primary reason employees prefer office work.", "answer": "B", "explanation": "'water cooler moments'指同事间随意的交流，常能激发创新。"},
            {"id": "CET6-RC-P1-03", "ability": "推理判断", "question": "Why do critics argue against hybrid work models?", "optionA": "They require too much investment in technology.", "optionB": "They fail to deliver the full advantages of either approach.", "optionC": "They are only suitable for large corporations.", "optionD": "They increase the frequency of office conflicts.", "answer": "B", "explanation": "批评者认为混合模式是'两全其美的最差版本'，未能充分发挥任何一种模式的优势。"},
            {"id": "CET6-RC-P1-04", "ability": "主旨归纳", "question": "What is the passage primarily concerned with?", "optionA": "The technological infrastructure required for remote work", "optionB": "The broad impacts of the shift toward remote employment", "optionC": "The history of labor movements in the 21st century", "optionD": "The psychological effects of workplace isolation", "answer": "B", "explanation": "文章主要讨论远程工作带来的广泛影响，包括生产力、企业文化、房地产市场和全球劳动力市场。"},
            {"id": "CET6-RC-P1-05", "ability": "态度推断", "question": "What is the author's overall tone regarding the globalization of the workforce?", "optionA": "Entirely enthusiastic about its benefits", "optionB": "Objective, presenting both opportunities and concerns", "optionC": "Deeply pessimistic about wage depression", "optionD": "Indifferent to its economic consequences", "answer": "B", "explanation": "作者以客观态度呈现全球化劳动力的利弊，既提到发展中国家的机会，也提到发达国家的竞争压力。"}
        ]
    },
    {
        "passage_id": 2,
        "title": "The Ethics of Gene Editing",
        "text": """The development of CRISPR-Cas9 gene-editing technology has been hailed as one of the most significant breakthroughs in modern biology. The technique allows scientists to make precise modifications to DNA with unprecedented accuracy and efficiency, opening the door to potential cures for genetic diseases, improved crop resilience, and even the elimination of certain hereditary conditions.

However, the technology raises profound ethical questions. In 2018, Chinese scientist He Jiankui announced that he had used CRISPR to edit the genes of twin girls, making them resistant to HIV. The announcement was met with widespread condemnation from the scientific community, not because the goal was inherently wrong, but because the procedure was performed without adequate safety testing or ethical oversight. The incident prompted an international debate about where to draw the line between therapeutic intervention and enhancement.

The distinction between healing and enhancing is not always clear-cut. Few would argue against editing a gene that causes a fatal childhood disease. But what about editing genes to increase intelligence, enhance athletic ability, or select for preferred physical traits? If such enhancements become possible—and many scientists believe they eventually will—they could exacerbate existing social inequalities. Wealthy families might afford genetic advantages for their children, creating a biological divide that compounds economic disparities.

Regulatory frameworks have struggled to keep pace with technological advancement. The United States prohibits the use of federal funds for research on human germline editing—changes that can be inherited by future generations—but does not ban the practice outright. China introduced new regulations following the He Jiankui affair, and the European Union has adopted a precautionary approach. Yet enforcement remains inconsistent, and the global nature of scientific research means that permissive regulations in one country can undermine restrictions in another.

Some ethicists advocate for a moratorium on heritable gene editing until international consensus can be reached on appropriate safeguards. Others argue that such delays cost lives—every year without gene therapy for conditions like sickle cell disease or cystic fibrosis means more suffering. The challenge lies in balancing the urgency of medical need against the risks of unintended consequences, both biological and social.""",
        "questions": [
            {"id": "CET6-RC-P2-01", "ability": "细节定位", "question": "Why was He Jiankui's experiment widely condemned?", "optionA": "The goal of making children resistant to HIV was unethical.", "optionB": "The procedure lacked adequate safety testing and ethical oversight.", "optionC": "CRISPR technology was too new to be used on humans.", "optionD": "The experiment was funded by an unauthorized organization.", "answer": "B", "explanation": "文中明确指出谴责的原因是缺乏充分的安全测试和伦理审查。"},
            {"id": "CET6-RC-P2-02", "ability": "推理判断", "question": "What concern does the passage raise about genetic enhancements?", "optionA": "They may lead to new types of genetic diseases.", "optionB": "They could widen the gap between rich and poor.", "optionC": "They will reduce the diversity of the human gene pool.", "optionD": "They are scientifically impossible to achieve.", "answer": "B", "explanation": "文章指出基因增强可能加剧社会不平等，富裕家庭可以为孩子购买基因优势。"},
            {"id": "CET6-RC-P2-03", "ability": "同义替换", "question": "The word 'exacerbate' in the passage most nearly means:", "optionA": "eliminate", "optionB": "worsen", "optionC": "disguise", "optionD": "reverse", "answer": "B", "explanation": "exacerbate意为'加剧、恶化'，与worsen同义。"},
            {"id": "CET6-RC-P2-04", "ability": "推理判断", "question": "What can be inferred about global regulation of gene editing?", "optionA": "All countries have agreed on uniform regulations.", "optionB": "International cooperation is hindered by inconsistent national policies.", "optionC": "Most countries have banned all forms of gene editing.", "optionD": "The United Nations has established binding global rules.", "answer": "B", "explanation": "文中提到执行不一致，一个国家宽松的法规会削弱另一个国家的限制。"},
            {"id": "CET6-RC-P2-05", "ability": "态度推断", "question": "What position do some ethicists take regarding heritable gene editing?", "optionA": "It should be pursued immediately without restrictions.", "optionB": "It should be paused until international safeguards are established.", "optionC": "It should be banned permanently regardless of medical benefits.", "optionD": "It should only be allowed for agricultural applications.", "answer": "B", "explanation": "一些伦理学家主张在国际达成共识前暂停可遗传的基因编辑。"}
        ]
    },
    {
        "passage_id": 3,
        "title": "Urban Agriculture and Food Security",
        "text": """As the global population approaches 10 billion by 2050, ensuring food security has become one of the most pressing challenges of the 21st century. Traditional agriculture, which occupies roughly 38 percent of the world's land surface, is increasingly strained by climate change, water scarcity, and soil degradation. In response, urban agriculture—encompassing rooftop gardens, vertical farms, community plots, and hydroponic systems—has emerged as a promising complement to conventional food production.

The appeal of urban agriculture extends beyond mere food supply. Proponents argue that locally grown produce reduces the carbon footprint associated with long-distance transportation, provides fresher and more nutritious food, and strengthens community bonds. In cities like Detroit, where economic decline has left vast tracts of vacant land, urban farming has also served as a tool for neighborhood revitalization, transforming abandoned lots into productive green spaces.

Yet urban agriculture faces significant limitations. The scale of production is inherently constrained by the availability of urban land, and even the most efficient vertical farms cannot match the output of conventional agriculture in terms of calories per acre. Energy consumption is another concern: indoor farming operations require substantial artificial lighting and climate control, which can offset the environmental benefits of reduced transportation. A 2020 study published in Nature Food found that lettuce grown in vertical farms produced approximately three times more greenhouse gas emissions than field-grown lettuce, primarily due to energy demands.

Economic viability remains uncertain as well. The initial capital investment for vertical farming systems can run into millions of dollars, and operating costs—particularly electricity—remain high. While premium prices for locally sourced, pesticide-free produce can sustain some operations, widespread adoption depends on significant cost reductions through technological innovation.

Nevertheless, advances in LED lighting efficiency, renewable energy integration, and automated growing systems are gradually improving the economics. Some analysts project that the global vertical farming market will exceed \$20 billion by 2030, suggesting that urban agriculture will play an increasingly important role in the food system, even if it cannot replace traditional farming entirely.""",
        "questions": [
            {"id": "CET6-RC-P3-01", "ability": "细节定位", "question": "How much of the world's land surface does traditional agriculture occupy?", "optionA": "Approximately 20 percent", "optionB": "Approximately 38 percent", "optionC": "Approximately 50 percent", "optionD": "Approximately 10 percent", "answer": "B", "explanation": "文中明确指出传统农业占全球陆地面积约38%。"},
            {"id": "CET6-RC-P3-02", "ability": "推理判断", "question": "What can be inferred about urban farming in Detroit?", "optionA": "It has replaced traditional agriculture entirely.", "optionB": "It has helped transform unused urban spaces productively.", "optionC": "It has been largely unsuccessful due to poor soil quality.", "optionD": "It operates primarily as a commercial enterprise.", "answer": "B", "explanation": "底特律的城市农业将废弃地块变为生产性绿地，帮助社区复兴。"},
            {"id": "CET6-RC-P3-03", "ability": "推理判断", "question": "Why might vertical farming not always be more environmentally friendly than conventional farming?", "optionA": "Vertical farms use more water than field agriculture.", "optionB": "The energy required for lighting and climate control can produce significant emissions.", "optionC": "Vertical farms generate more organic waste.", "optionD": "Transportation costs for vertical farm products are higher.", "answer": "B", "explanation": "Nature Food的研究发现垂直农场的碳排放是传统种植的3倍，主要因为能源需求。"},
            {"id": "CET6-RC-P3-04", "ability": "同义替换", "question": "The word 'constrained' in the passage most nearly means:", "optionA": "enhanced", "optionB": "limited", "optionC": "measured", "optionD": "ignored", "answer": "B", "explanation": "constrained意为'受限的'，与limited同义。"},
            {"id": "CET6-RC-P3-05", "ability": "主旨归纳", "question": "What is the main idea of the passage?", "optionA": "Urban agriculture will completely replace traditional farming by 2050.", "optionB": "Urban agriculture offers benefits but faces significant scalability and economic challenges.", "optionC": "Vertical farming is the most cost-effective method of food production.", "optionD": "Community gardens are the primary solution to global food insecurity.", "answer": "B", "explanation": "文章主旨是城市农业有潜力但面临规模化和经济可行性的重大挑战。"}
        ]
    },
    {
        "passage_id": 4,
        "title": "The Psychology of Digital Addiction",
        "text": """The average American adult spends more than seven hours per day looking at screens, a figure that has risen steadily over the past decade and accelerated dramatically during the pandemic. While technology has brought undeniable benefits—from instant communication to access to vast repositories of knowledge—a growing body of research suggests that excessive screen time may be reshaping our brains in ways we are only beginning to understand.

Neuroscientists have found that the constant stimulation provided by smartphones and social media triggers the release of dopamine in the brain's reward center, creating a cycle of craving and satisfaction that mirrors the neurological patterns observed in substance addiction. Each notification, like, or message provides a micro-dose of this neurotransmitter, reinforcing the behavior that led to it. This is not accidental; technology companies employ teams of behavioral psychologists to design features that maximize engagement, a practice that former Google design ethicist Tristan Harris has described as "hijacking the mind."

The consequences are particularly concerning for adolescents. Studies have linked heavy social media use among teenagers to increased rates of anxiety, depression, and loneliness—paradoxically, the very conditions that social media purports to alleviate. The phenomenon of "social comparison," in which users measure their own lives against the curated highlights of others, has been identified as a key mechanism. A large-scale study by the University of Pennsylvania found that limiting social media use to 30 minutes per day significantly reduced feelings of loneliness and depression among college students.

Sleep disruption is another well-documented effect. The blue light emitted by screens suppresses melatonin production, delaying the onset of sleep and reducing its quality. The National Sleep Foundation reports that 90 percent of Americans use electronic devices within an hour of bedtime, a habit that sleep specialists strongly advise against.

Critics of the "digital addiction" framing argue that it pathologizes normal behavior and overlooks the agency of individual users. They contend that people choose to engage with technology because it enriches their lives, not because they are compelled by neurological forces beyond their control. While this perspective has some merit, the asymmetry of information and resources between technology companies and individual users suggests that the relationship is not purely voluntary.""",
        "questions": [
            {"id": "CET6-RC-P4-01", "ability": "细节定位", "question": "According to the passage, what triggers dopamine release in smartphone users?", "optionA": "Reading long-form articles", "optionB": "Notifications, likes, and messages", "optionC": "Turning off the device", "optionD": "Face-to-face conversations", "answer": "B", "explanation": "文中指出通知、点赞和消息都会触发多巴胺释放。"},
            {"id": "CET6-RC-P4-02", "ability": "推理判断", "question": "Why is social comparison considered harmful according to the passage?", "optionA": "It encourages people to share too much personal information.", "optionB": "It leads users to compare themselves unfavorably with others' idealized portrayals.", "optionC": "It reduces the amount of time people spend on social media.", "optionD": "It makes users more empathetic toward others.", "answer": "B", "explanation": "社交比较让人将自己的生活与他人精心展示的亮点对比，导致焦虑和抑郁。"},
            {"id": "CET6-RC-P4-03", "ability": "推理判断", "question": "What does Tristan Harris mean by 'hijacking the mind'?", "optionA": "Technology companies are secretly reading users' thoughts.", "optionB": "Design features are deliberately crafted to manipulate user attention and behavior.", "optionC": "Users are forced to buy products they don't need.", "optionD": "Smartphones are physically addictive like drugs.", "answer": "B", "explanation": "'劫持心智'指科技公司有意设计功能来操纵用户注意力和行为。"},
            {"id": "CET6-RC-P4-04", "ability": "态度推断", "question": "What is the author's position on the 'digital addiction' debate?", "optionA": "Digital addiction is a myth invented by technophobes.", "optionB": "The relationship between users and technology is entirely voluntary.", "optionC": "While users have some agency, the power imbalance with tech companies undermines pure voluntariness.", "optionD": "Government should ban all social media platforms.", "answer": "C", "explanation": "作者承认个人有选择权，但指出科技公司与用户之间的信息不对称意味着这种关系并非完全自愿。"},
            {"id": "CET6-RC-P4-05", "ability": "主旨归纳", "question": "What is the best summary of the passage?", "optionA": "Technology companies are solely responsible for digital addiction.", "optionB": "Excessive screen time may have neurological and psychological effects that warrant careful consideration.", "optionC": "All screen time is harmful and should be eliminated.", "optionD": "Digital addiction is identical to substance addiction in every way.", "answer": "B", "explanation": "文章总结为过度屏幕时间可能产生神经和心理影响，值得认真考虑。"}
        ]
    },
    {
        "passage_id": 5,
        "title": "The Rise of ESG Investing",
        "text": """Environmental, Social, and Governance (ESG) investing has moved from the periphery to the mainstream of global finance. In 2023, ESG-themed funds managed more than $40 trillion in assets worldwide, a tenfold increase from a decade earlier. This surge reflects a growing consensus among investors that companies with strong environmental practices, social responsibility, and sound governance are better positioned for long-term success.

The environmental pillar of ESG encompasses a company's impact on the natural world, including carbon emissions, waste management, and resource conservation. The social component addresses labor practices, community relations, diversity, and human rights. Governance covers board structure, executive compensation, shareholder rights, and anti-corruption policies. Proponents argue that companies excelling in these areas tend to exhibit lower risk profiles and more resilient business models.

However, ESG investing is not without its critics. One major concern is "greenwashing"—the practice of exaggerating or fabricating environmental credentials to attract investment. Unlike financial metrics, which are subject to rigorous accounting standards, ESG ratings are largely self-reported and inconsistently verified. Different rating agencies often assign vastly different scores to the same company, undermining the reliability of ESG benchmarks.

Furthermore, the financial performance of ESG funds has been mixed. While some studies show that companies with high ESG scores outperform their peers over the long term, others find no statistically significant relationship after controlling for sector and size. In 2022 and 2023, several high-profile ESG funds underperformed the broader market, partly because they were underweight in energy stocks during a period of rising oil prices.

Regulatory bodies are beginning to address these shortcomings. The European Union's Sustainable Finance Disclosure Regulation requires fund managers to provide detailed reporting on the ESG characteristics of their products. The U.S. Securities and Exchange Commission has proposed similar rules for climate-related disclosures. These measures aim to bring greater transparency and standardization to the ESG landscape, though their effectiveness remains to be seen.""",
        "questions": [
            {"id": "CET6-RC-P5-01", "ability": "细节定位", "question": "How much did ESG-themed funds manage in assets in 2023?", "optionA": "More than $4 trillion", "optionB": "More than $40 trillion", "optionC": "More than $400 billion", "optionD": "More than $400 trillion", "answer": "B", "explanation": "文中明确指出2023年ESG主题基金管理超过40万亿美元资产。"},
            {"id": "CET6-RC-P5-02", "ability": "推理判断", "question": "Why is greenwashing a significant problem for ESG investing?", "optionA": "It reduces the fees that fund managers can charge.", "optionB": "ESG ratings lack standardization and reliable verification.", "optionC": "It only affects small companies with limited resources.", "optionD": "Investors prefer companies with poor environmental records.", "answer": "B", "explanation": "ESG评级缺乏标准化和可靠验证，不同评级机构对同一公司评分差异大。"},
            {"id": "CET6-RC-P5-03", "ability": "推理判断", "question": "Why did some ESG funds underperform in 2022-2023?", "optionA": "They were heavily invested in technology stocks that crashed.", "optionB": "They had too little exposure to energy stocks during rising oil prices.", "optionC": "They charged excessively high management fees.", "optionD": "They invested primarily in government bonds.", "answer": "B", "explanation": "ESG基金在能源股上配置不足，而油价上涨期间能源股表现良好。"},
            {"id": "CET6-RC-P5-04", "ability": "同义替换", "question": "The word 'underweight' in the passage most nearly means:", "optionA": "physically too heavy", "optionB": "holding a smaller proportion than benchmark", "optionC": "lacking nutritional value", "optionD": "having no investment at all", "answer": "B", "explanation": "投资语境中underweight指'低配'，即持有比例低于基准。"},
            {"id": "CET6-RC-P5-05", "ability": "态度推断", "question": "What is the author's attitude toward ESG regulation?", "optionA": "Confident that it will immediately solve all ESG problems", "optionB": "Cautiously supportive but uncertain about its effectiveness", "optionC": "Strongly opposed to any government intervention", "optionD": "Indifferent to regulatory developments", "answer": "B", "explanation": "作者支持监管但对其效果持谨慎态度，'their effectiveness remains to be seen'。"}
        ]
    },
    {
        "passage_id": 6,
        "title": "Language Preservation in the Digital Age",
        "text": """Of the approximately 7,000 languages spoken in the world today, linguists estimate that nearly half will disappear by the end of this century. Each language that vanishes takes with it a unique system of knowledge, cultural practices, and ways of understanding the world that cannot be recovered once lost. The acceleration of language extinction is driven by a combination of factors, including globalization, urbanization, and the dominance of a handful of major languages in digital spaces.

The internet, often celebrated as a democratizing force, has paradoxically contributed to linguistic homogenization. English, Mandarin, and Spanish account for the vast majority of online content, while speakers of minority languages find their digital presence severely limited. This creates a feedback loop: as more content is produced in dominant languages, speakers of minority languages are compelled to switch to these languages for online participation, further reducing the digital footprint of their native tongues.

However, technology also offers tools for preservation. Digital archiving projects, such as the Endangered Languages Project and Google's Woolaroo, use machine learning and crowd-sourcing to document and revitalize threatened languages. Mobile applications enable speakers to learn and practice their heritage languages, while social media platforms provide spaces for linguistic communities that may be geographically dispersed.

The success of Māori language revitalization in New Zealand demonstrates what concerted effort can achieve. Through a combination of immersion schools (kōhanga reo), media broadcasting, and government policy, the number of Māori speakers has grown significantly over the past three decades. Similar initiatives in Wales, Hawaii, and Catalonia have shown that language decline can be reversed, though it requires sustained investment and community commitment.

Critics argue that some preservation efforts amount to little more than creating museum pieces—cataloging languages for academic study without enabling them to function as living means of communication. The challenge, then, is not merely to record languages but to create the social and economic conditions in which they can thrive. This may require rethinking how we value linguistic diversity, not as a cultural curiosity but as an essential component of human intellectual heritage.""",
        "questions": [
            {"id": "CET6-RC-P6-01", "ability": "细节定位", "question": "How many languages are estimated to disappear by the end of this century?", "optionA": "About 1,000", "optionB": "About 3,500", "optionC": "About 5,000", "optionD": "About 7,000", "answer": "B", "explanation": "全球约7000种语言，预计近一半（约3500种）将在本世纪末消失。"},
            {"id": "CET6-RC-P6-02", "ability": "推理判断", "question": "Why does the internet contribute to linguistic homogenization?", "optionA": "It blocks access to content in minority languages.", "optionB": "Dominant languages dominate online content, creating pressure to switch.", "optionC": "It only allows content in English.", "optionD": "It discourages people from learning foreign languages.", "answer": "B", "explanation": "主导语言的网络内容占绝对多数，形成反馈循环迫使少数语言使用者转向主导语言。"},
            {"id": "CET6-RC-P6-03", "ability": "推理判断", "question": "What can be inferred from the Māori language revitalization example?", "optionA": "Language preservation requires only digital tools.", "optionB": "Coordinated policy, education, and media efforts can reverse language decline.", "optionC": "Only indigenous communities in the Pacific can save their languages.", "optionD": "Government funding is the single most important factor.", "answer": "B", "explanation": "毛利语复兴通过沉浸式学校、媒体广播和政府政策的综合努力取得成功。"},
            {"id": "CET6-RC-P6-04", "ability": "态度推断", "question": "What do critics suggest about some language preservation efforts?", "optionA": "They are too expensive to justify.", "optionB": "They treat languages as museum artifacts rather than living tools.", "optionC": "They focus too much on creating new vocabulary.", "optionD": "They should prioritize written records over spoken language.", "answer": "B", "explanation": "批评者认为一些保护工作只是'创造博物馆展品'，而非让语言成为活的交流工具。"},
            {"id": "CET6-RC-P6-05", "ability": "主旨归纳", "question": "What is the passage mainly about?", "optionA": "The superiority of English as a global language", "optionB": "The threat of language extinction and the dual role of technology in preservation", "optionC": "The history of linguistic research in the 21st century", "optionD": "Why all minority languages should be abandoned", "answer": "B", "explanation": "文章主要讨论语言消亡的威胁以及技术在保护中的双重角色。"}
        ]
    }
]

# 读取当前文件
with open('public/cet6_diagnosis_questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 补入阅读passages
data['passages'] = reading_passages

# 重新统计
reading_total = sum(len(p['questions']) for p in data['passages'])
listening_total = sum(len(p['questions']) for p in data['listening_passages'])
data['total_questions'] = reading_total + listening_total

# 统一听力题的ability维度名称
ability_map = {'细节理解': '细节定位', '主旨归纳': '主旨归纳', '推理判断': '推理判断', '态度判断': '态度推断', '主旨理解': '主旨归纳', '细节捕捉': '细节定位', '态度理解': '态度推断'}
for lp in data.get('listening_passages', []):
    for q in lp.get('questions', []):
        old_a = q.get('ability', '')
        q['ability'] = ability_map.get(old_a, old_a)

# 更新能力分布统计
abilities = {}
for p in data['passages']:
    for q in p['questions']:
        a = q.get('ability', '未知')
        abilities[a] = abilities.get(a, 0) + 1
for p in data['listening_passages']:
    for q in p['questions']:
        a = q.get('ability', '未知')
        abilities[a] = abilities.get(a, 0) + 1
data['ability_summary'] = abilities

with open('public/cet6_diagnosis_questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'阅读passages: {len(data["passages"])}')
print(f'阅读题: {reading_total}, 听力题: {listening_total}')
print(f'写作: {len(data["writing_prompts"])}, 翻译: {len(data["translation_prompts"])}')
print(f'总题数: {data["total_questions"]}')
print(f'能力分布: {abilities}')
