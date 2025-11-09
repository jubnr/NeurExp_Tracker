// lib/screens/post_experience_screen.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/utils/constants.dart';

class PostExperienceScreen extends StatefulWidget {
  final Study study;
  final Participant participant;
  // Optionnel: passer les RunInfo si besoin de les afficher ou les sauvegarder ici
  // final List<RunInfo> runInfos;

  const PostExperienceScreen({
    super.key,
    required this.study,
    required this.participant,
    // required this.runInfos,
  });

  @override
  State<PostExperienceScreen> createState() => _PostExperienceScreenState();
}

class _PostExperienceScreenState extends State<PostExperienceScreen> {
  final TextEditingController _globalAppreciationController = TextEditingController();
  final TextEditingController _finalNotesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Charger les instructions post-expérience de l'étude
    // Charger les données finales du participant si elles existent
  }

  @override
  void dispose() {
    _globalAppreciationController.dispose();
    _finalNotesController.dispose();
    super.dispose();
  }

  // Sauvegarder les informations finales
  void _saveFinalNotes() {
    // TODO: Implémenter la sauvegarde des notes et de l'appréciation globale.
    // Mettre à jour le statut du participant à 'completed' et augmenter le compteur dans l'étude.
    print('Sauvegarde des notes finales pour ${widget.participant.nip}');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Notes finales sauvegardées !')),
    );

    // Ici, vous mettez à jour le participant et l'étude pour marquer comme complété.
    // Vous devrez peut-être naviguer vers l'écran d'accueil ou un écran de résumé.
    // Exemple : Navigator.of(context).popUntil((route) => route.isFirst); // Retourne à la page d'accueil
  }

  // Gérer la prise de photo finale (placeholder)
  void _takeFinalPhoto() {
    print('Prendre une photo finale...');
    // TODO: Implémenter la logique de prise de photo
  }

  @override
  Widget build(BuildContext context) {
    // Afficher les instructions post-expérience de l'étude
    final List<String> postExperienceInstructions = widget.study.postExperimentInstructions;

    return Scaffold(
      appBar: AppBar(
        title: Text('Post-Expérience - ${widget.participant.nip}'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // Instructions post-expérience de l'étude
            if (postExperienceInstructions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Étapes finales pour cette étude :',
                      style: kSubtitleTextStyle.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ...postExperienceInstructions.map((instruction) => Padding(
                      padding: const EdgeInsets.only(bottom: 4.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline, color: kLightBlue, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(instruction, style: kCardSubtitleTextStyle)),
                        ],
                      ),
                    )).toList(),
                  ],
                ),
              ),

            // Appréciation globale du participant
            TextFormField(
              controller: _globalAppreciationController,
              decoration: const InputDecoration(labelText: 'Appréciation globale du participant'),
              maxLines: 3,
              onChanged: (value) { /* Sauvegarde temporaire si besoin */ },
            ),
            const SizedBox(height: 16),

            // Notes finales
            TextFormField(
              controller: _finalNotesController,
              decoration: const InputDecoration(labelText: 'Notes finales'),
              maxLines: 5,
              onChanged: (value) { /* Sauvegarde temporaire si besoin */ },
            ),
            const SizedBox(height: 16),

            // Photo finale
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Ajouter photo finale'),
                  onPressed: _takeFinalPhoto,
                ),
                // Afficher la photo si prise
              ],
            ),
            const SizedBox(height: 32),

            // Bouton pour sauvegarder et marquer comme complété
            Center(
              child: ElevatedButton(
                onPressed: _saveFinalNotes,
                child: const Text('Terminer et Marquer comme Complété'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}