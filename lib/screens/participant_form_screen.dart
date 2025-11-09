// lib/screens/participant_form_screen.dart (Mise à jour du champ Genre et NIP)
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:neurexp_tracker/models/participant.dart'; // Assurez-vous que Gender est bien défini ici
import 'package:neurexp_tracker/models/study.dart';
import 'package:uuid/uuid.dart';
import 'package:neurexp_tracker/utils/constants.dart';
import 'package:neurexp_tracker/screens/preparation_screen.dart';

extension StringExtension on String {
  String capitalizeFirstLetter() {
    if (this.isEmpty) return "";
    return "${this[0].toUpperCase()}${this.substring(1)}";
  }
}

class ParticipantFormScreen extends StatefulWidget {
  final Study study;
  final Participant? initialParticipant;

  const ParticipantFormScreen({
    super.key,
    required this.study,
    this.initialParticipant,
  });

  @override
  State<ParticipantFormScreen> createState() => _ParticipantFormScreenState();
}

class _ParticipantFormScreenState extends State<ParticipantFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nipController;
  late Gender _selectedGender; // Utiliser l'énumération Gender
  late TextEditingController _ageController;
  late DateTime? _selectedExperimentDate;
  late ParticipantStatus _selectedStatus;

  bool get _isEditing => widget.initialParticipant != null;

  @override
  void initState() {
    super.initState();
    _nipController = TextEditingController();
    _ageController = TextEditingController();

    if (_isEditing) {
      final p = widget.initialParticipant!;
      _nipController.text = p.nip.split('-').last; // Prend seulement le numéro du NIP
      _selectedGender = p.gender; // Initialise avec le genre existant
      _ageController.text = p.age.toString();
      _selectedExperimentDate = p.experimentDate;
      _selectedStatus = p.status;
    } else {
      _selectedGender = Gender.other; // Genre par défaut
      _selectedExperimentDate = null;
      _selectedStatus = ParticipantStatus.recruited;
    }
  }

  @override
  void dispose() {
    _nipController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  void _saveAndProceed() {
    if (_formKey.currentState!.validate()) {
      final String nipNumber = _nipController.text;
      final String nip = 'NIP-$nipNumber'; // Ajoute le préfixe NIP-

      final Participant finalParticipant = Participant(
        id: widget.initialParticipant?.id ?? const Uuid().v4(),
        nip: nip,
        gender: _selectedGender, // Utilise l'énumération Gender
        age: int.tryParse(_ageController.text) ?? 0,
        experimentDate: _selectedExperimentDate,
        status: _selectedStatus,
        // Si on édite, on devrait aussi récupérer les runData existants
        // runData: _isEditing ? widget.initialParticipant!.runData : [], // Exemple, si nécessaire
      );

      final DateTime now = DateTime.now();
      final bool isToday = _selectedExperimentDate != null &&
          _selectedExperimentDate!.year == now.year &&
          _selectedExperimentDate!.month == now.month &&
          _selectedExperimentDate!.day == now.day;

      if (!_isEditing && isToday && _selectedStatus != ParticipantStatus.completed) {
        final Participant participantToStart = Participant(
          id: finalParticipant.id,
          nip: finalParticipant.nip,
          gender: finalParticipant.gender,
          age: finalParticipant.age,
          experimentDate: finalParticipant.experimentDate ?? now,
          status: ParticipantStatus.upcoming,
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => PreparationScreen(
              study: widget.study,
              participant: participantToStart,
            ),
          ),
        );
      } else {
        Navigator.of(context).pop(finalParticipant);
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedExperimentDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
      builder: (BuildContext context, Widget? child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: kDarkBlue,
            colorScheme: const ColorScheme.light(primary: kDarkBlue),
            buttonTheme: const ButtonThemeData(textTheme: ButtonTextTheme.primary),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedExperimentDate) {
      setState(() {
        _selectedExperimentDate = picked;
        if (_selectedStatus == ParticipantStatus.recruited) {
          _selectedStatus = ParticipantStatus.upcoming;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final DateTime now = DateTime.now();
    final bool isToday = _selectedExperimentDate != null &&
        _selectedExperimentDate!.year == now.year &&
        _selectedExperimentDate!.month == now.month &&
        _selectedExperimentDate!.day == now.day;

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Modifier Participant' : 'Nouveau Participant'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            tooltip: 'Sauvegarder',
            onPressed: _saveAndProceed,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: ListView(
            children: [
              // Champ NIP (Numéro d'Identification du Participant)
              TextFormField(
                controller: _nipController,
                decoration: const InputDecoration(
                  labelText: 'Numéro du Participant',
                  hintText: 'Ex: 01',
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly], // Ne permet que les chiffres
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Veuillez entrer le numéro du participant';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Champ Genre avec Dropdown et Icône
              DropdownButtonFormField<Gender>(
                value: _selectedGender, // La valeur sélectionnée
                decoration: InputDecoration(
                  labelText: 'Genre',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.0)),
                  contentPadding: const EdgeInsets.all(16.0),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: Gender.values.map((gender) {
                  return DropdownMenuItem<Gender>(
                    value: gender,
                    child: Row(
                      children: [
                        Icon(gender.icon, size: 20), // Icône pour chaque option
                        const SizedBox(width: 10),
                        Text(gender.displayName), // Nom lisible du genre
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (Gender? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedGender = newValue; // Met à jour le genre sélectionné
                    });
                  }
                },
              ),
              const SizedBox(height: 16),

              // Champ Âge
              TextFormField(
                controller: _ageController,
                decoration: const InputDecoration(labelText: 'Âge'),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly], // N'accepte que les chiffres
                validator: (value) {
                  if (value == null || value.isEmpty) return null; // Champ optionnel
                  final age = int.tryParse(value);
                  if (age == null || age <= 0 || age > 120) { // Validation basique de l'âge
                    return 'Veuillez entrer un âge valide';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Sélecteur de Date pour l'expérience prévue
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(context),
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'Date d\'expérience prévue',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8.0)),
                          contentPadding: const EdgeInsets.all(16.0),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        isEmpty: _selectedExperimentDate == null,
                        child: _selectedExperimentDate == null
                            ? Text('Sélectionnez une date', style: kCardSubtitleTextStyle.copyWith(color: kLightBlue))
                            : Text("${_selectedExperimentDate!.toLocal().toIso8601String().split('T')[0]}", style: const TextStyle(fontSize: 16.0)),
                      ),
                    ),
                  ),
                  // Bouton pour effacer la date si elle est sélectionnée
                  if (_selectedExperimentDate != null)
                    IconButton(
                      icon: const Icon(Icons.clear),
                      tooltip: 'Effacer la date',
                      onPressed: () {
                        setState(() {
                          _selectedExperimentDate = null;
                          _selectedStatus = ParticipantStatus.recruited; // Si on efface la date, on revient à 'recruited'
                        });
                      },
                    ),
                ],
              ),
              const SizedBox(height: 16),

              // Sélecteur de Statut
              DropdownButtonFormField<ParticipantStatus>(
                value: _selectedStatus,
                decoration: const InputDecoration(labelText: 'Statut du Participant'),
                items: ParticipantStatus.values.map((status) {
                  return DropdownMenuItem<ParticipantStatus>(
                    value: status,
                    child: Text(status.displayName), // Utilisation de l'extension displayName
                  );
                }).toList(),
                onChanged: (ParticipantStatus? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedStatus = newValue;
                      // Logique pour mettre à jour la date si le statut change
                      if (_selectedStatus != ParticipantStatus.upcoming) {
                        _selectedExperimentDate = null; // Efface la date si le statut n'est pas 'upcoming'
                      } else if (_selectedStatus == ParticipantStatus.upcoming && _selectedExperimentDate == null) {
                        // Suggère d'ajouter une date si le statut est 'upcoming' et qu'il n'y a pas de date
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Pensez à ajouter une date d\'expérience !')),
                        );
                      }
                    });
                  }
                },
              ),
              const SizedBox(height: 32),

              // Bouton "Commencer l'expérience aujourd'hui"
              if (!_isEditing && isToday && _selectedStatus != ParticipantStatus.completed)
                Center(
                  child: ElevatedButton(
                    onPressed: _saveAndProceed, // Ce bouton déclenche le flux de préparation
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[700],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                    ),
                    child: const Text('Commencer l\'expérience aujourd\'hui'),
                  ),
                ),

              // Bouton de sauvegarde générique (pour édition ou si on ne commence pas aujourd'hui)
              if (_isEditing || !(isToday && _selectedStatus != ParticipantStatus.completed))
                Center(
                  child: ElevatedButton(
                    onPressed: _saveAndProceed,
                    child: Text(_isEditing ? 'Sauvegarder les modifications' : 'Sauvegarder'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}