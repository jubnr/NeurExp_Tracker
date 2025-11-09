// lib/screens/participant_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart'; // Assurez-vous que cet import est correct
import 'package:neurexp_tracker/models/study.dart'; // Assurez-vous que cet import est correct
import 'package:neurexp_tracker/utils/constants.dart'; // Assurez-vous que cet import est correct
import 'dart:io'; // Nécessaire pour Image.file

class ParticipantDetailScreen extends StatelessWidget {
  final Participant participant;
  final Study study;

  const ParticipantDetailScreen({
    super.key,
    required this.participant,
    required this.study,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${participant.nip} - Détails'),
        centerTitle: true,
        actions: [
          // Bouton pour éditer le participant
          IconButton(
            icon: const Icon(Icons.edit),
            tooltip: 'Modifier les informations',
            onPressed: () {
              // Naviguer vers ParticipantFormScreen en mode édition
              // Gérer le retour de la modification ici si nécessaire (par exemple, pour rafraîchir l'UI)
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Fonctionnalité d\'édition à implémenter')),
              );
              // Exemple de navigation (vous devrez gérer le retour de cette page)
              // Navigator.of(context).push(MaterialPageRoute(builder: (context) => ParticipantFormScreen(study: study, initialParticipant: participant)));
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // Informations générales du participant
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Informations Générales', style: kTitleTextStyle.copyWith(fontSize: 20)),
                    const SizedBox(height: 16),
                    Text('NIP: ${participant.nip}', style: kCardTitleTextStyle),
                    const SizedBox(height: 8),
                    Text('Genre: ${participant.gender}', style: kCardSubtitleTextStyle),
                    Text('Âge: ${participant.age}', style: kCardSubtitleTextStyle),
                    if (participant.experimentDate != null)
                      Text('Date prévue: ${participant.experimentDate!.toLocal().toIso8601String().split('T')[0]}', style: kCardSubtitleTextStyle),
                    Text('Statut: ${participant.status.displayName}', style: kCardSubtitleTextStyle.copyWith(color: participant.getBorderColor())),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Détails des Runs effectués
            if (participant.runData.isNotEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ExpansionTile(
                    title: Text('Détails des ${participant.runData.length} runs', style: kSubtitleTextStyle.copyWith(fontWeight: FontWeight.bold)),
                    children: participant.runData.map<Widget>((runInfo) => ListTile(
                      dense: true,
                      title: Text(runInfo.runId, style: kCardTitleTextStyle.copyWith(fontSize: 16)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (runInfo.notes.isNotEmpty) Text('Notes: ${runInfo.notes}', style: kCardSubtitleTextStyle.copyWith(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                          if (runInfo.participantResponse.isNotEmpty) Text('Réponse: ${runInfo.participantResponse}', style: kCardSubtitleTextStyle.copyWith(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                          if (runInfo.participantImpressionEmoji != '😐') Text('Impression: ${runInfo.participantImpressionEmoji}', style: kCardSubtitleTextStyle.copyWith(fontSize: 12)),
                          if (runInfo.problematicChannels != null) Text('Canaux: ${runInfo.problematicChannels}', style: kCardSubtitleTextStyle.copyWith(fontSize: 12)),
                          if (runInfo.imageUrl != null) Text('Photo: Oui', style: kCardSubtitleTextStyle.copyWith(fontSize: 12)),
                        ],
                      ),
                      onTap: runInfo.imageUrl != null ? () => _showFullScreenImage(context, runInfo.imageUrl!) : null,
                    )).toList(),
                  ),
                ),
              ),

            // Message si aucun run n'a été effectué et que le participant est complété
            if (participant.runData.isEmpty && participant.status == ParticipantStatus.completed)
              const Center(child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text('Aucune donnée de run enregistrée pour ce participant.'),
              )),
          ],
        ),
      ),
    );
  }

  // Fonction pour afficher une image en plein écran dans un dialogue
  void _showFullScreenImage(BuildContext context, String imagePath) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: EdgeInsets.zero,
          child: InteractiveViewer( // Permet le zoom et le déplacement
            child: Image.file(
              File(imagePath),
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) =>
                  const Center(child: Icon(Icons.error, color: Colors.red)),
            ),
          ),
        );
      },
    );
  }
}